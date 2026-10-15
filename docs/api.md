# Proposed Core API (`@calendrix/core`)

Goal: a pure TypeScript core with no dependency on the DOM or any framework. Each adapter only subscribes to the state and spreads the `getXProps` results onto elements.

> **Status:** design draft. Only the date helpers and the Gregorian calendar are implemented so far (see the [roadmap](roadmap.md)). Everything below describes the planned public API.

---

## 1. Base types

```ts
/** Identifier of a calendar system. Extensible through plugins. */
export type CalendarSystem = 'gregory' | 'persian' | 'islamic' | (string & {});

/** A date without time or time zone. The only date representation used by the core. */
export interface CalendarDate {
  readonly system: CalendarSystem;
  readonly year: number;
  readonly month: number; // 1 to 12, or 13 in some systems
  readonly day: number;
}

export type SelectionMode = 'single' | 'range' | 'multiple';

export type Direction = 'ltr' | 'rtl';

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface DateRange {
  start: CalendarDate;
  end: CalendarDate;
}

export type Selection = CalendarDate | DateRange | CalendarDate[] | null;
```

---

## 2. Inputs (options)

```ts
export interface CalendarOptions {
  /** Calendar system to display */
  system?: CalendarSystem;
  /** BCP 47 locale used for month/weekday names and numerals. Examples: 'fa-IR', 'en-US', 'de-DE' */
  locale?: string;
  /** Derived from the locale if omitted */
  direction?: Direction;
  weekStart?: WeekStart;

  mode?: SelectionMode;
  /** Controlled mode */
  value?: Selection;
  /** Uncontrolled mode */
  defaultValue?: Selection;
  onChange?: (value: Selection) => void;

  /** The date that determines the visible month/year */
  focusedDate?: CalendarDate;
  onFocusedDateChange?: (date: CalendarDate) => void;

  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  /** Disable specific days (for example market holidays) */
  isDateUnavailable?: (date: CalendarDate) => boolean;

  /** Plugins: extra calendar systems, holidays, market calendars */
  plugins?: CalendarPlugin[];
}
```

---

## 3. Output: read-only state

```ts
export interface CalendarState {
  readonly system: CalendarSystem;
  readonly locale: string;
  readonly direction: Direction;
  readonly mode: SelectionMode;

  readonly value: Selection;
  readonly focusedDate: CalendarDate;
  /** The visible month (usually derived from focusedDate) */
  readonly visibleMonth: { year: number; month: number };

  /** Month grid ready to render: weeks, each containing days */
  readonly weeks: ReadonlyArray<ReadonlyArray<DayCell>>;
  readonly weekdayLabels: ReadonlyArray<{ short: string; long: string }>;
  readonly monthLabel: string; // for example "Mehr 1405" or "October 2026"
}

export interface DayCell {
  readonly date: CalendarDate;
  readonly label: string; // numeral formatted for the locale ("۱۴" or "14")
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isInRange: boolean;
  readonly isRangeStart: boolean;
  readonly isRangeEnd: boolean;
  readonly isFocused: boolean;
  readonly isOutsideMonth: boolean;
  readonly isDisabled: boolean;
  readonly isUnavailable: boolean;
  /** Data added by plugins (for example { holiday: 'Nowruz', marketClosed: true }) */
  readonly meta: Readonly<Record<string, unknown>>;
}
```

---

## 4. Main surface: `createCalendar`

```ts
export interface Calendar {
  /** Read the current state (stable snapshot: the same reference until something changes) */
  getState(): CalendarState;

  /** For adapters: useSyncExternalStore / signal / ref */
  subscribe(listener: () => void): () => void;

  /** Update options (for example when component props change) */
  setOptions(options: Partial<CalendarOptions>): void;

  // --- Navigation ---
  nextMonth(): void;
  prevMonth(): void;
  nextYear(): void;
  prevYear(): void;
  goTo(date: CalendarDate): void;
  goToToday(): void;

  // --- Selection ---
  select(date: CalendarDate): void;
  clear(): void;

  // --- Keyboard (ARIA grid pattern) ---
  /** Handles Arrow/Home/End/PageUp/PageDown/Enter/Space keys */
  handleKeyDown(event: KeyEventLike): boolean; // true = handled

  // --- Prop getters (the heart of the headless pattern) ---
  getRootProps(): Record<string, unknown>;
  getGridProps(): Record<string, unknown>;
  getDayProps(date: CalendarDate): Record<string, unknown>;
  getPrevButtonProps(): Record<string, unknown>;
  getNextButtonProps(): Record<string, unknown>;

  destroy(): void;
}

/** Only the fields the core needs; no dependency on the DOM */
export interface KeyEventLike {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault(): void;
}

export function createCalendar(options?: CalendarOptions): Calendar;
```

**Prop getter contract:** the result of `getDayProps` includes `role="gridcell"`, `aria-selected`, `aria-disabled`, `aria-label` (the full date text in the active locale), `tabIndex` (`0` only for the focused day), `data-*` attributes for styling, and `onClick` / `onKeyDown` handlers. Handler names are camelCase in the core; the Vue adapter would map them to `@click` and the Angular adapter to `(click)`. Alternatively the core can return handlers separately from attributes; see **open decision 2** below.

---

## 5. Plugin system

To keep the core small, every extra calendar and feature is a plugin.

```ts
export interface CalendarPlugin {
  name: string;

  /** Register a new calendar system (for example Persian or Islamic) */
  calendars?: CalendarImplementation[];

  /** Add data to each day (holidays, market trading days, ...) */
  decorateDay?(date: CalendarDate, ctx: PluginContext): Record<string, unknown> | void;

  /** Affect whether a day is selectable (for example market closed) */
  isDateUnavailable?(date: CalendarDate, ctx: PluginContext): boolean | void;
}

/** Contract for implementing a calendar system */
export interface CalendarImplementation {
  id: CalendarSystem;
  daysInMonth(year: number, month: number): number;
  monthsInYear(year: number): number;
  /** Conversion to/from an epoch day: the pivot for all conversions */
  toEpochDay(date: CalendarDate): number;
  fromEpochDay(epochDay: number): CalendarDate;
}
```

Example of the finance calendar plugin (a later release):

```ts
import { createCalendar } from '@calendrix/core';
import { persian } from '@calendrix/persian';
import { marketCalendar, tseHolidays } from '@calendrix/finance';

const cal = createCalendar({
  system: 'persian',
  locale: 'fa-IR',
  plugins: [
    persian(),
    marketCalendar({
      market: 'TSE',
      weekend: [4, 5], // Thursday/Friday
      holidays: tseHolidays, // injectable data
    }),
  ],
});
```

> Note: the implemented `CalendarImplementation` in `packages/core/src/types.ts` additionally has `isLeapYear(year)`. The version above is the original proposal; the source code is the reference.

---

## 6. Using the core in adapters

**React** (about 15 lines):

```ts
import { useSyncExternalStore, useRef, useEffect } from 'react';
import { createCalendar, type CalendarOptions } from '@calendrix/core';

export function useCalendar(options: CalendarOptions) {
  const ref = useRef<ReturnType<typeof createCalendar>>();
  if (!ref.current) ref.current = createCalendar(options);
  const cal = ref.current;

  useEffect(() => {
    cal.setOptions(options);
  }); // sync props
  useEffect(() => () => cal.destroy(), [cal]);

  const state = useSyncExternalStore(cal.subscribe, cal.getState, cal.getState);
  return { state, calendar: cal };
}
```

**Vue:** `shallowRef(cal.getState())` plus `cal.subscribe(() => ref.value = cal.getState())` inside `onScopeDispose`.

**Angular:** `signal(cal.getState())` plus `cal.subscribe(() => sig.set(cal.getState()))` inside `DestroyRef`.

---

## 7. Open decisions (before freezing the API)

These are intentionally left open. Find the answers by building the Angular and Vue prototypes.

1. **Internal date representation:** a `CalendarDate` triple (year/month/day) with a `system` field, or an epoch-day number? The triple is more readable; the epoch day makes conversion simpler. Proposal: triple in the public API, epoch day only inside calendar implementations.
2. **Prop getters and handlers:** one single object (convenient for React) or separate `attrs` and `handlers` (easier for Vue/Angular, where event names differ)? Proposal: separate them; in React a small helper merges them.
3. **Time zone safety:** "today" in which time zone? Add a `timeZone` option and an injectable `now()` for tests.
4. **Temporal API:** for now rely on `Intl.DateTimeFormat` with `calendar: 'persian'` and hide it behind `CalendarImplementation`, so a later migration needs no API change.
5. **Multiple months:** showing 2 or 3 months side by side (for range selection). In `state`, should this be `months: MonthGrid[]` or a single month? If you plan to support it, make it an array now.

---

## 8. Next steps (first week)

1. Set up the monorepo (pnpm + Turborepo + tsup + Vitest).
2. Implement `gregory` on top of epoch-day math, with leap-year and month-boundary tests.
3. `createCalendar` with navigation and `weeks` (no selection yet).
4. Add `single` selection and `handleKeyDown`.
5. First `useCalendar` in React and a demo page.
