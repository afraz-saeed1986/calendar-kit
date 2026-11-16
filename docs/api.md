# Proposed Core API (`@calendrix/core`)

Goal: a pure TypeScript core with no dependency on the DOM or any framework. Each adapter only subscribes to the state and spreads the `getXProps` results onto elements.

> **Status:** design draft. Implemented so far: date helpers, the Gregorian and Persian calendars, and `createCalendar` with the month grid, navigation, `single` selection, keyboard handling and prop getters (see the [roadmap](roadmap.md)). Range and multiple selection, time and the plugin extras are still planned. Where the source differs from this draft, the source is the reference.

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

`getState()` returns a snapshot. It is the same object until something changes, so it fits `useSyncExternalStore`, a Vue ref and an Angular signal as it is. The types are in `packages/core/src/types.ts`; these are the main fields of `CalendarState<M>`:

```ts
export interface CalendarState<M extends SelectionMode = 'single'> {
  readonly system: CalendarSystem;
  readonly locale: string;
  readonly direction: Direction;
  readonly weekStart: WeekStart;
  /** The selection mode: 'single', 'range' or 'multiple'. */
  readonly selection: M;
  /** The selection, in the calendar system being displayed. */
  readonly value: SelectionValue<M>;
  /** Range mode: the first day of a range that is not complete yet. */
  readonly anchor: CalendarDate | null;
  readonly focusedDate: CalendarDate;

  /** The first visible month and its grid (always 6 weeks of 7 days). */
  readonly visibleMonth: { readonly year: number; readonly month: number };
  readonly weeks: ReadonlyArray<ReadonlyArray<DayCell>>;
  readonly weekdayLabels: ReadonlyArray<WeekdayLabel>;
  readonly monthLabel: string; // for example "October 2026" or "مهر ۱۴۰۵"

  /** 1 to 3 visible months. The first one is also described by the fields above. */
  readonly visibleMonths: number;
  readonly grids: ReadonlyArray<MonthGrid>;
  readonly visibleLabel: string;

  /** What is shown: the days of the month, the months of the year, or a page of years. */
  readonly view: CalendarView;
  readonly monthName: string;
  readonly yearLabel: string;
  readonly months: ReadonlyArray<MonthCell>;
  readonly years: ReadonlyArray<YearCell>;
  readonly yearsLabel: string;

  /** Grows when the DOM focus should move to the focused cell (see below). */
  readonly focusRequest: number;
}

export interface DayCell {
  readonly date: CalendarDate;
  readonly label: string; // numeral formatted for the locale ("۱۴" or "14")
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isRangeStart: boolean;
  readonly isRangeEnd: boolean;
  readonly isInRange: boolean;
  readonly isInPreview: boolean; // range mode: part of the range that would be chosen
  readonly isFocused: boolean;
  readonly isOutsideMonth: boolean;
  readonly isDisabled: boolean; // outside minDate..maxDate
  readonly isUnavailable: boolean; // isDateUnavailable or a plugin
  /** Data added by plugins (for example { holiday: 'Nowruz', marketClosed: true }) */
  readonly meta: Readonly<Record<string, unknown>>;
}
```

**Moving the DOM focus.** The core holds no DOM. When `handleKeyDown` handles a key, or the view changes (the buttons of the month and the year, a month or a year chosen, `setView`), `focusRequest` grows by one, even when nothing else in the state changed. An adapter remembers the last value it saw; after it renders a new one, it focuses the element with `tabindex="0"` in the grid. The first value is only remembered. Clicking a day or a navigation button does not change it. `TimeFieldState` has the same field: it grows when typing completes a segment and the next one becomes active, and the adapter focuses the `[data-segment]` named by `activeSegment` (ADR 0019).

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

**Prop getter contract (implemented):** every prop getter returns `{ attrs, handlers }`. `attrs` use DOM attribute names and `handlers` use DOM event names, so each adapter maps them to its own syntax (React `onClick` and `tabIndex`, Vue `@click`, Angular `(click)`). `getDayProps` returns `role="gridcell"`, `tabindex` (`0` only for the focused day), `aria-selected`, `aria-disabled`, `aria-current`, `aria-label` (the full date in the active locale), `data-*` attributes for styling and a `click` handler. `getGridProps` returns `role="grid"` and the single `keydown` handler. Attributes with the value `undefined` are left off. See [ADR 0006](adr/0006-selection-keyboard-props.md).

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

React, Angular and a Vue prototype use the same core (ADR 0015, ADR 0019). These are the rules every adapter follows:

1. **State.** Keep the snapshot of `getState()` in the reactive primitive of the framework and update it from `subscribe` (`useSyncExternalStore`, `shallowRef`, `signal`). Close the subscription and call `destroy()` when the component goes away.
2. **Creation.** Create the core once, when all inputs are known: `now`, `timeZone`, `defaultValue` and `focusedDate` are read only then. Pass later changes to `setOptions`.
3. **Options.** Pass every input as it is. An option that is `undefined` means "not set", also in `setOptions`: an input that goes back to `undefined` is cleared. Do not drop such keys.
4. **Value.** `value` and `onChange` map to the two-way binding of the framework (`model()`, `v-model`, a controlled prop). A value that is `undefined` leaves the core uncontrolled.
5. **Props.** Apply the `{ attrs, handlers }` of the prop getters to the element. `normalizeAttributes` writes the attributes as strings (React DOM does the same by itself). Handler names are DOM event names.
6. **Focus.** Move the DOM focus when `focusRequest` changes (see section 3).

In Angular the core is created in `ngOnInit`, `subscribe` sets a `signal`, `DestroyRef` closes it and an `effect` calls `setOptions`. In React, `useCalendar` of `@calendrix/react` also keeps callbacks and arrays stable between renders. In Vue the whole composable is about 20 lines (`apps/vue-proto/src/use-calendar.ts`):

```ts
export function useCalendar<M extends SelectionMode = 'single'>(
  options: MaybeRefOrGetter<Partial<CalendarOptions<M>>>,
) {
  const read = () => toValue(options);
  const calendar = createCalendar<M>(read());
  const state = shallowRef(calendar.getState());

  const unsubscribe = calendar.subscribe(() => {
    state.value = calendar.getState();
  });
  watch(read, (next) => calendar.setOptions(next));

  onScopeDispose(() => {
    unsubscribe();
    calendar.destroy();
  });

  return { calendar, state };
}
```

---

## 7. Decisions made while building the adapters

These were open before the adapters existed. React, Angular and the Vue prototype answered them.

1. **Internal date representation.** `CalendarDate` is a triple (`system`, `year`, `month`, `day`) in the public API. The epoch day is used only inside the calendar implementations (`CalendarImplementation.toEpochDay`), and it is the pivot for converting between systems.
2. **Prop getters and handlers.** `attrs` and `handlers` are separate objects with DOM attribute and event names (ADR 0006). All three adapters apply them without a change of format. The rule for boolean attributes is in the documentation of `ElementProps` and in `normalizeAttributes` (ADR 0019).
3. **Time zone safety.** The options `timeZone` and `now` decide "today". They are read when the core is created (ADR 0015, finding 3).
4. **Temporal API.** Not used. Calendar arithmetic lives in `CalendarImplementation` (the Persian calendar is a plugin); the names of months and days and the numerals come from `Intl`.
5. **Multiple months.** `visibleMonths` (1 to 3) and `grids: MonthGrid[]`. The first month is also described by `weeks`, `monthLabel` and the like.

What is left before the freeze of v1 is listed in the roadmap (M3).

---

## 8. Next steps (first week)

1. Set up the monorepo (pnpm + Turborepo + tsup + Vitest).
2. Implement `gregory` on top of epoch-day math, with leap-year and month-boundary tests.
3. `createCalendar` with navigation and `weeks` (no selection yet).
4. Add `single` selection and `handleKeyDown`.
5. First `useCalendar` in React and a demo page.
