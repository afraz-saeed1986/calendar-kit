# Core API (`@calendrix/core`)

Goal: a pure TypeScript core with no dependency on the DOM or any framework. Each adapter only subscribes to the state and spreads the `getXProps` results onto elements.

> **Status:** implemented, and used by the React and Angular adapters and a Vue prototype (see the [roadmap](roadmap.md)). Where the source differs from this document, the source is the reference: `packages/core/src/types.ts`.

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

/** The value of a calendar for each selection mode. */
export interface SelectionValueMap {
  single: CalendarDate | null;
  range: DateRange | null;
  /** An empty array means that nothing is selected. */
  multiple: CalendarDate[];
}

export type SelectionValue<M extends SelectionMode = 'single'> = SelectionValueMap[M];
```

---

## 2. Inputs (options)

```ts
export interface CalendarOptions<M extends SelectionMode = 'single'> {
  /** Calendar system to display. Default: 'gregory'. */
  system?: CalendarSystem;
  /** BCP 47 locale for names and numerals: 'fa-IR', 'en-US', 'de-DE'. Default: 'en-US'. */
  locale?: string;
  /** Default: derived from the locale's language. */
  direction?: Direction;
  /** Default: first day of the week of the locale (Saturday for Persian, Sunday otherwise). */
  weekStart?: WeekStart;

  /** The date that decides the visible month. Default: today. */
  focusedDate?: CalendarDate;
  onFocusedDateChange?: (date: CalendarDate) => void;

  /**
   * How days are selected: one day (default), a range with a start and an end, or any number of
   * separate days. The type of `value` and `onChange` follows this option.
   */
  selection?: M;
  /** Controlled when passed (`null` means "controlled, nothing selected"). */
  value?: SelectionValue<M>;
  /** Initial value of an uncontrolled calendar. */
  defaultValue?: SelectionValue<M>;
  /** Called with the new value; `null` (or `[]`) when the selection is cleared. */
  onChange?: (value: SelectionValue<M>) => void;

  /** How many months are shown at once: 1 (default), 2 or 3. */
  visibleMonths?: number;
  /** Range mode: allow a range that contains unavailable days. Default: true. */
  allowUnavailableInRange?: boolean;
  /** Multiple mode: the most days that can be selected. Default: no limit. */
  maxSelected?: number;

  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  /** Mark specific days as not selectable, for example market holidays. */
  isDateUnavailable?: (date: CalendarDate) => boolean;

  /** Texts for buttons. Defaults come from the locale (English, Persian and German are built in). */
  labels?: Partial<CalendarLabels & ViewLabels>;

  /** Time zone that decides what "today" is. Default: the runtime's time zone. */
  timeZone?: string;
  /** Clock used for "today". Inject a fixed clock in tests. Default: `() => new Date()`. */
  now?: () => Date;

  /**
   * The user cannot change anything: the props describe inert elements, and `handleKeyDown` and
   * `previewTo` are ignored. The methods and `setOptions` still work. Default: false (ADR 0022).
   */
  disabled?: boolean;

  /** Plugins register calendar systems and decorate days. */
  plugins?: CalendarPlugin[];
}
```

`now`, `timeZone`, `defaultValue` and `focusedDate` are read only when the core is created. An option set to `undefined` means "not set", also in `setOptions` (ADR 0019).

---

## 3. Output: read-only state

`getState()` returns a snapshot. It is the same object until something changes, so it fits `useSyncExternalStore`, a Vue ref and an Angular signal as it is. The types are in `packages/core/src/types.ts`; these are the main fields of `CalendarState<M>`:

```ts
export interface CalendarState<M extends SelectionMode = 'single'> {
  readonly system: CalendarSystem;
  readonly locale: string;
  readonly direction: Direction;
  readonly weekStart: WeekStart;
  /** True when the calendar is `disabled`: the user cannot change it. */
  readonly disabled: boolean;
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
export function createCalendar<M extends SelectionMode = 'single'>(
  options?: CalendarOptions<M>,
): Calendar<M>;

export interface Calendar<M extends SelectionMode = 'single'> {
  /** Current state: the same reference until something changes. */
  getState(): CalendarState<M>;
  /** For adapters: useSyncExternalStore, signals, refs. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Merge new options. A key with the value `undefined` unsets that option. */
  setOptions(options: Partial<CalendarOptions<M>>): void;

  // --- Navigation ---
  nextMonth(): void;
  prevMonth(): void;
  nextYear(): void;
  prevYear(): void;
  /** Show the month that contains `date` (any calendar system) and focus it. */
  goTo(date: CalendarDate): void;
  goToToday(): void;

  // --- Selection ---
  /** Select a day (any calendar system). Ignored when the day is disabled or unavailable. */
  select(date: CalendarDate): void;
  clear(): void;
  /** Range mode: preview the range from the pending first day to `date`; `null` removes it. */
  previewTo(date: CalendarDate | null): void;

  // --- Views ---
  /** The days of the month, the months of the year, or a page of years. */
  setView(view: CalendarView): void;
  chooseMonth(month: number): void;
  chooseYear(year: number): void;

  // --- Keyboard (ARIA grid pattern) ---
  /** Handles the arrow keys, Home, End, PageUp, PageDown, Enter, Space and Escape. */
  handleKeyDown(event: KeyEventLike): boolean; // true = handled

  // --- Prop getters (the heart of the headless pattern) ---
  getRootProps(): ElementProps<Record<string, never>>;
  /** Props for one visible month (`index` 0 is the first). */
  getGridProps(index?: number): ElementProps<{ keydown: (event: KeyEventLike) => void }>;
  getDayProps(date: CalendarDate): ElementProps<{ click: () => void }>;
  getPrevButtonProps(): ElementProps<{ click: () => void }>;
  getNextButtonProps(): ElementProps<{ click: () => void }>;
  getMonthButtonProps(): ElementProps<{ click: () => void }>;
  getYearButtonProps(): ElementProps<{ click: () => void }>;
  getMonthProps(month: number): ElementProps<{ click: () => void }>;
  getYearProps(year: number): ElementProps<{ click: () => void }>;

  destroy(): void;
}

/** Only the fields the core needs; no dependency on the DOM */
export interface KeyEventLike {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  preventDefault(): void;
}
```

**Prop getter contract:** every prop getter returns `{ attrs, handlers }`. `attrs` use DOM attribute names and `handlers` use DOM event names, so each adapter maps them to its own syntax (React `onClick` and `tabIndex`, Vue `@click`, Angular `(click)`). Attributes with the value `undefined` are left off. In `aria-*` and `data-*` attributes a boolean is written as text (`"true"`, `"false"`); in any other attribute `true` means present and `false` means absent. `normalizeAttributes` applies this rule. `getDayProps` returns `role="gridcell"`, `tabindex` (`0` only for the focused day), `aria-selected`, `aria-disabled`, `aria-current`, `aria-label` (the full date in the active locale), `data-*` attributes for styling and a `click` handler. `getGridProps` returns `role="grid"`, `aria-label` and the single `keydown` handler. See [ADR 0006](adr/0006-selection-keyboard-props.md).

**`disabled`** ([ADR 0022](adr/0022-disabled-option.md)). `createCalendar` and `createTimeField` accept `disabled: true`, and their state has `disabled`. It stops what the user does: the props of every element become inert (`tabindex="-1"`, `aria-disabled="true"`, a real `disabled` on buttons, `data-disabled` on the root, and no handlers), and `handleKeyDown`, `previewTo` (calendar) and `focusSegment` (time field) are ignored. It does not stop what the application does: `select`, `nextMonth`, `increment`, `clear` and `setOptions` still work, so a form can write a value into a disabled control. `DayCell.isDisabled` is something else: one day outside `minDate`..`maxDate`.

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
  isLeapYear(year: number): boolean;
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

In Angular the core is created in `ngOnInit`, `subscribe` sets a `signal`, `DestroyRef` closes it and an `effect` calls `setOptions`. In React, `useCalendar` of `@calendrix/react` also keeps callbacks and arrays stable between renders. In Vue the whole composable is about 20 lines (`packages/vue/src/use-calendar.ts`):

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

These were open before the adapters existed. React, Angular and Vue answered them.

1. **Internal date representation.** `CalendarDate` is a triple (`system`, `year`, `month`, `day`) in the public API. The epoch day is used only inside the calendar implementations (`CalendarImplementation.toEpochDay`), and it is the pivot for converting between systems.
2. **Prop getters and handlers.** `attrs` and `handlers` are separate objects with DOM attribute and event names (ADR 0006). All three adapters apply them without a change of format. The rule for boolean attributes is in the documentation of `ElementProps` and in `normalizeAttributes` (ADR 0019).
3. **Time zone safety.** The options `timeZone` and `now` decide "today". They are read when the core is created (ADR 0015, finding 3).
4. **Temporal API.** Not used. Calendar arithmetic lives in `CalendarImplementation` (the Persian calendar is a plugin); the names of months and days and the numerals come from `Intl`.
5. **Multiple months.** `visibleMonths` (1 to 3) and `grids: MonthGrid[]`. The first month is also described by `weeks`, `monthLabel` and the like.

What is left before the freeze of v1 is listed in the roadmap (M3).

---

## 8. Time of day: `createTimeField`

A time input made of segments (hour, minute, optional seconds, AM/PM). It holds no DOM: adapters render the segments and attach the props from `getSegmentProps`.

```ts
export function createTimeField(options?: TimeFieldOptions): TimeField;

/** A time of day on a 24-hour clock. */
export interface TimeValue {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

/** A date and a time of day on the wall clock. It has no time zone: see `toInstant` and `fromInstant`. */
export interface DateTimeValue {
  readonly date: CalendarDate;
  readonly time: TimeValue;
}

/** A start and an end, each with a date and a time (ADR 0023). */
export interface DateTimeRange {
  readonly start: DateTimeValue;
  readonly end: DateTimeValue;
}

/** What `DateTimePicker` has in `selection`: one date and time, or a range. */
export type DateTimeMode = 'single' | 'range';
/** The value of a `DateTimePicker`: `DateTimeValue | null` for `single`, `DateTimeRange | null` for `range`. */
export type DateTimePickerValue<M extends DateTimeMode> = M extends 'range'
  ? DateTimeRange | null
  : DateTimeValue | null;

export type HourCycle = 12 | 24;
export type TimeSegmentType = 'hour' | 'minute' | 'second' | 'period';

export interface TimeFieldOptions {
  /** BCP 47 locale for numerals and the AM/PM text. Default: 'en-US'. */
  locale?: string;
  /** 12 or 24. Default: the locale's own habit. */
  hourCycle?: HourCycle;
  /** Show a seconds segment. Default: false. */
  showSeconds?: boolean;
  /** Step of the up and down arrows. Default: 1. */
  hourStep?: number;
  minuteStep?: number;
  secondStep?: number;
  /** Values outside this range are rejected. */
  minTime?: TimeValue;
  maxTime?: TimeValue;

  /** Passing `value` (even `null`) makes the field controlled. */
  value?: TimeValue | null;
  defaultValue?: TimeValue | null;
  onChange?: (value: TimeValue | null) => void;

  labels?: Partial<TimeFieldLabels>;
}

export interface TimeField {
  getState(): TimeFieldState;
  subscribe(listener: () => void): () => void;
  /** Merge new options. A key that is present with the value `undefined` unsets that option. */
  setOptions(options: Partial<TimeFieldOptions>): void;

  /** Mark a segment as the one being edited. Adapters call this from the element's focus event. */
  focusSegment(type: TimeSegmentType): void;
  /** Step a segment up (1) or down (-1). An empty field first becomes `minTime` or 00:00:00. */
  increment(type: TimeSegmentType, direction: 1 | -1): void;
  /** Empty the field. */
  clear(): void;
  /** Keyboard handling for one segment. Returns true, after `preventDefault()`, when the key was handled. */
  handleKeyDown(type: TimeSegmentType, event: KeyEventLike): boolean;

  getRootProps(): ElementProps<Record<string, never>>;
  getSegmentProps(type: TimeSegmentType): ElementProps<{
    keydown: (event: KeyEventLike) => void;
    focus: () => void;
  }>;

  destroy(): void;
}
```

`TimeFieldState` has `locale`, `direction`, `hourCycle`, `value`, `segments`, `activeSegment` and `focusRequest`. Each segment has `type`, `text` (`"09"`, `"PM"`, or `"--"` when empty), `isPlaceholder`, `numericValue` (for `aria-valuenow`; for the period 0 is AM and 1 is PM), `min`, `max` and `label`. The value is always on a 24-hour clock, also when the field shows 12 hours. Typed digits can be Latin, Persian or Arabic-Indic. A digit that completes a segment makes the next one active and grows `focusRequest` (see section 3). As in `createCalendar`, `defaultValue` is read only when the field is created.

---

## 9. Text, ISO and time zone helpers

Pure functions, with no state. They are what the pickers use to write and read the text in their inputs.

| Function | Result | What it does |
| --- | --- | --- |
| `formatDate(date, locale?)` | `string` | A numeric date the way the locale writes it, with its own numerals. |
| `parseDate(text, options?)` | `CalendarDate \| null` | Reads a typed date. `options` is `{ locale?, system? }`. `null` when the text is not a valid date. |
| `datePatternOf(locale?, system?)` | `DatePattern` | The order of the fields (`['day', 'month', 'year']` for de-DE) and the separator of a locale, read from `Intl`. |
| `formatDateRange(range, locale?)` | `string` | `start – end`. |
| `parseDateRange(text, options?)` | `DateRange \| null` | Reads a typed range; the ends are put in order. |
| `formatTime(time, options?)` | `string` | `"09:05"` (de-DE), `"09:05 AM"` (en-US, 12 hours), `"۰۹:۰۵"` (fa-IR). `options` is `{ locale?, hourCycle?, seconds? }`. |
| `parseTime(text)` | `TimeValue \| null` | Reads a typed time. |
| `formatDateTime(value, options?)` | `string` | A date and a time in one text. `options` is `TextTimeOptions`. |
| `parseDateTime(text, options?)` | `DateTimeValue \| null` | Reads a typed date and time. `options` is `{ locale?, system? }`. |
| `formatDateTimeRange(range, options?)` | `string` | A range of two dates and times in one text, joined by an en dash. `options` is `TextTimeOptions`. |
| `parseDateTimeRange(text, options?)` | `DateTimeRange \| null` | Reads a typed range. Both ends are needed; if the end is earlier than the start, the two are swapped. `options` is `{ locale?, system? }`. |
| `stickEndToStart(range)` | `DateTimeRange` | If the start is later than the end, returns a range whose end equals the start; otherwise returns the same object. The pickers use it when a time is edited. |
| `toInstant(value, timeZone?)` | `Date` | The real instant of a wall-clock value in a time zone. Default: the runtime's time zone. |
| `fromInstant(instant, timeZone?, system?)` | `DateTimeValue` | The wall-clock value of an instant, in a time zone and a calendar system. |
| `formatISODate(date)` / `parseISODate(text, system?)` | `string` / `CalendarDate \| null` | The ISO form (`2026-11-18`). |
| `formatISOTime(time, { seconds? })` / `parseISOTime(text)` | `string` / `TimeValue \| null` | The ISO form of a time. |
| `normalizeDigits(text)` | `string` | Persian and Arabic-Indic digits to Latin digits. |

Date arithmetic and conversion: `convertDate(date, system)`, `addDays`, `addMonths` and `addYears` (`date`, `amount`), `compareDates(a, b)` (negative, zero or positive), `isSameDay(a, b)`, `createDate` and `dayOfWeek` (see `date.ts`). Calendar systems are registered with `registerCalendar(implementation)` and read with `getCalendar(system)`; `gregory` is exported, and the Persian calendar comes from the `@calendrix/persian` plugin.

---

## 10. Helpers for the pickers

The pickers (`DatePicker`, `DateTimePicker`) belong to the adapters, but their texts are shared, so every adapter says the same thing. `PickerLabels` also has `startTime` and `endTime`, the names of the two time fields of a `DateTimePicker` with `selection="range"` (built in for en, fa and de).

```ts
/** Texts the pickers put on their own buttons. */
export interface PickerLabels {
  /** The button that opens the calendar. */
  openCalendar: string;
  /** The name of the popover dialog. */
  dialog: string;
  clear: string;
  done: string;
}

/** Which picker the texts are for: a date picker has no time. */
export type PickerKind = 'date' | 'dateTime';

/** English, Persian and German are built in. `overrides` replace single texts. */
export function pickerLabelsFor(
  locale: string,
  overrides?: Partial<PickerLabels>,
  kind?: PickerKind, // default 'dateTime'
): PickerLabels;
```

`formatSelection` writes the text of the input for any selection (one day, a range or a list), `datesSelectedText` is the text of a long list ("5 dates"), `isEmptySelection` tells whether a selection holds nothing, and `toSystem` converts a selection to another calendar system.

---

## 11. Helper for adapters

```ts
/** Turns the `attrs` of a prop getter into the strings to write on an element. */
export function normalizeAttributes(attrs: Record<string, AttributeValue>): Record<string, string>;
```

`undefined` is left off. In `aria-*` and `data-*` attributes a boolean is written as text (`"true"`, `"false"`); in any other attribute `true` is present with an empty value and `false` is left off. Numbers become text. React DOM does this by itself, so `@calendrix/react` does not use it (ADR 0019).