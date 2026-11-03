import type { CalendarDate, CalendarOptions } from '@calendrix/core';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { toReactProps } from './props';
import { useCalendar } from './use-calendar';

export interface CalendarProps extends CalendarOptions {
  className?: string;
}

const cellKey = (date: CalendarDate) => `${date.year}-${date.month}-${date.day}`;

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
 * A month calendar with the ARIA grid pattern. It has no styles of its own: style the
 * `calendrix-*` classes and the `data-*` attributes, or import `@calendrix/react/styles.css`.
 * It accepts every option of `createCalendar`.
 */
export function Calendar({ className, ...options }: CalendarProps) {
  const { calendar, state } = useCalendar(options);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusPending = useRef(false);

  /** The focused day is the one with tabindex 0: it has to get the real DOM focus. */
  const focusFocusedDay = () => {
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  };

  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    focusFocusedDay();
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const before = calendar.getState();
    if (!calendar.handleKeyDown(event)) return;
    // A changed state re-renders first, and the effect above moves the focus afterwards.
    if (calendar.getState() === before) focusFocusedDay();
    else focusPending.current = true;
  };

  return (
    <div
      {...toReactProps(calendar.getRootProps())}
      className={['calendrix-calendar', className].filter(Boolean).join(' ')}
    >
      <div className="calendrix-header">
        <button
          {...toReactProps(calendar.getPrevButtonProps())}
          className="calendrix-nav calendrix-prev"
        >
          <Chevron direction="previous" />
        </button>
        <div className="calendrix-title" aria-live="polite">
          {state.monthLabel}
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
        onKeyDown={handleKeyDown}
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
      </div>
    </div>
  );
}
