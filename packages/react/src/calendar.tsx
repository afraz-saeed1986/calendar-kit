import type {
  CalendarDate,
  CalendarOptions,
  ElementProps,
  MonthGrid,
  SelectionMode,
} from '@calendrix/core';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { toReactProps } from './props';
import { useCalendar } from './use-calendar';

export interface CalendarProps<M extends SelectionMode = 'single'> extends CalendarOptions<M> {
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
 * they open a grid of months and a page of years. `visibleMonths` shows up to three months side
 * by side, and `selection` picks one day, a range or many days. It has no styles of its own:
 * style the `calendrix-*` classes and the `data-*` attributes, or import
 * `@calendrix/react/styles.css`. It accepts every option of `createCalendar`.
 */
export function Calendar<M extends SelectionMode = 'single'>({
  className,
  ...rest
}: CalendarProps<M>) {
  // `rest` is the props without `className`: exactly the options of the calendar.
  const { calendar, state } = useCalendar<M>(rest as unknown as CalendarOptions<M>);
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
  const [primary] = state.grids;
  const lastIndex = state.grids.length - 1;
  /** Several months side by side, in the days view. */
  const multi = view === 'days' && state.visibleMonths > 1;

  /** The header above a month. The first has the previous button, the last the next one. */
  const renderHeader = (index: number) => {
    const isFirst = index === 0;
    const isLast = view !== 'days' || index === lastIndex;
    return (
      <div className="calendrix-header">
        {isFirst ? (
          <button
            {...toReactProps(calendar.getPrevButtonProps())}
            className="calendrix-nav calendrix-prev"
          >
            <Chevron direction="previous" />
          </button>
        ) : (
          <span className="calendrix-nav-spacer" aria-hidden="true" />
        )}

        {isFirst ? (
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
        ) : (
          <div className="calendrix-title">{state.grids[index]?.label}</div>
        )}

        {isLast ? (
          <button
            {...toReactProps(calendar.getNextButtonProps())}
            className="calendrix-nav calendrix-next"
          >
            <Chevron direction="next" />
          </button>
        ) : (
          <span className="calendrix-nav-spacer" aria-hidden="true" />
        )}
      </div>
    );
  };

  /** The weekday names and the days of one month. */
  const renderDayGrid = (grid: MonthGrid, index: number) => (
    <div
      {...toReactProps(calendar.getGridProps(index))}
      ref={multi ? undefined : gridRef}
      className="calendrix-grid"
      data-view="days"
      onKeyDown={handleKeyDown}
      onPointerLeave={multi ? undefined : () => calendar.previewTo(null)}
    >
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
      {grid.weeks.map((week, weekIndex) => (
        <div key={weekIndex} role="row" className="calendrix-week">
          {week.map((cell) =>
            // With several months every day shows once: the days of the other months stay empty.
            multi && cell.isOutsideMonth ? (
              <div key={cellKey(cell.date)} role="presentation" className="calendrix-day-empty" />
            ) : (
              <div
                key={cellKey(cell.date)}
                {...toReactProps(calendar.getDayProps(cell.date))}
                className="calendrix-day"
                onPointerEnter={() => calendar.previewTo(cell.date)}
              >
                {cell.label}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      {...toReactProps(calendar.getRootProps())}
      className={['calendrix-calendar', className].filter(Boolean).join(' ')}
      data-view={view}
      data-months={multi ? state.visibleMonths : undefined}
      onKeyDown={handleRootKeyDown}
    >
      {multi ? (
        <div
          className="calendrix-panels"
          ref={gridRef}
          onPointerLeave={() => calendar.previewTo(null)}
        >
          {state.grids.map((grid, index) => (
            <div key={`${grid.year}-${grid.month}`} className="calendrix-panel">
              {renderHeader(index)}
              {renderDayGrid(grid, index)}
            </div>
          ))}
        </div>
      ) : (
        <>
          {renderHeader(0)}

          {view === 'days' && primary && renderDayGrid(primary, 0)}

          {view !== 'days' && (
            <div
              {...toReactProps(calendar.getGridProps())}
              ref={gridRef}
              className="calendrix-grid"
              data-view={view}
              onKeyDown={handleKeyDown}
            >
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
          )}
        </>
      )}
    </div>
  );
}
