import type { CalendarDate, CalendarOptions, ElementProps } from '@calendrix/core';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { toReactProps } from './props';
import { useCalendar } from './use-calendar';

export interface CalendarProps extends CalendarOptions {
  className?: string;
}

const COLUMNS = 3;

const cellKey = (date: CalendarDate) => `${date.year}-${date.month}-${date.day}`;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function Chevron({ direction }: { direction: 'previous' | 'next' }) {
  return (
    <svg
      className="calendrix-chevron"
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 16 16"
    >
      <path
        d={direction === 'previous' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A month calendar with the ARIA grid pattern. The month and the year in the header are buttons:
 * they open a grid of months and a page of years. It has no styles of its own: style the
 * `calendrix-*` classes and the `data-*` attributes, or import `@calendrix/react/styles.css`.
 * It accepts every option of `createCalendar`.
 */
export function Calendar({ className, ...options }: CalendarProps) {
  const { calendar, state } = useCalendar(options);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);

  /** The focused cell is the one with tabindex 0: it has to get the real DOM focus. */
  const focusFocusedCell = () => {
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  };

  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    focusFocusedCell();
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const before = calendar.getState();
    if (!calendar.handleKeyDown(event)) return;
    // A changed state re-renders first, and the effect above moves the focus afterwards.
    if (calendar.getState() === before) focusFocusedCell();
    else focusPending.current = true;
  };

  /** Escape leaves the months or the years from anywhere in the calendar, also from a button. */
  const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented || calendar.getState().view === 'days') {
      return;
    }
    event.preventDefault();
    calendar.setView('days');
    focusPending.current = true;
  };

  /** Buttons and cells that change the view: the grid they lead to takes the focus. */
  const switchingView = (props: ElementProps<{ click: () => void }>) => ({
    ...toReactProps(props),
    onClick: () => {
      props.handlers.click();
      focusPending.current = true;
    },
  });

  const { view } = state;

  return (
    <div
      {...toReactProps(calendar.getRootProps())}
      className={['calendrix-calendar', className].filter(Boolean).join(' ')}
      data-view={view}
      onKeyDown={handleRootKeyDown}
    >
      <div className="calendrix-header">
        <button
          {...toReactProps(calendar.getPrevButtonProps())}
          className="calendrix-nav calendrix-prev"
        >
          <Chevron direction="previous" />
        </button>
        <div className="calendrix-title" aria-live="polite">
          {view !== 'years' && (
            <button
              {...switchingView(calendar.getMonthButtonProps())}
              className="calendrix-title-button calendrix-month-button"
            >
              {state.monthName}
            </button>
          )}
          <button
            {...switchingView(calendar.getYearButtonProps())}
            className="calendrix-title-button calendrix-year-button"
          >
            {view === 'years' ? state.yearsLabel : state.yearLabel}
          </button>
        </div>
        <button
          {...toReactProps(calendar.getNextButtonProps())}
          className="calendrix-nav calendrix-next"
        >
          <Chevron direction="next" />
        </button>
      </div>

      <div
        {...toReactProps(calendar.getGridProps())}
        ref={gridRef}
        className="calendrix-grid"
        data-view={view}
        onKeyDown={handleKeyDown}
      >
        {view === 'days' && (
          <>
            <div role="row" className="calendrix-weekdays">
              {state.weekdayLabels.map((label) => (
                <div
                  key={label.long}
                  role="columnheader"
                  className="calendrix-weekday"
                  aria-label={label.long}
                >
                  {label.short}
                </div>
              ))}
            </div>
            {state.weeks.map((week, weekIndex) => (
              <div key={weekIndex} role="row" className="calendrix-week">
                {week.map((cell) => (
                  <div
                    key={cellKey(cell.date)}
                    {...toReactProps(calendar.getDayProps(cell.date))}
                    className="calendrix-day"
                  >
                    {cell.label}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {view === 'months' &&
          chunk(state.months, COLUMNS).map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="calendrix-row">
              {row.map((cell) => (
                <div
                  key={cell.month}
                  {...switchingView(calendar.getMonthProps(cell.month))}
                  className="calendrix-month"
                >
                  {cell.label}
                </div>
              ))}
            </div>
          ))}

        {view === 'years' &&
          chunk(state.years, COLUMNS).map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="calendrix-row">
              {row.map((cell) => (
                <div
                  key={cell.year}
                  {...switchingView(calendar.getYearProps(cell.year))}
                  className="calendrix-year"
                >
                  {cell.label}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
