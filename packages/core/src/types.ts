/**
 * Public types of @calendrix/core.
 *
 * The full design rationale lives in docs/api.md and docs/adr/.
 * Types marked "planned" describe the contract of `createCalendar`,
 * which is implemented in a later milestone (see docs/roadmap.md).
 */
import type { CalendarView, MonthCell, ViewLabels, YearCell } from './view-types';
/** Identifier of a calendar system. Extensible through plugins. */
export type CalendarSystem = 'gregory' | 'persian' | 'islamic' | (string & {});

/** A calendar date without time or time zone. */
export interface CalendarDate {
  readonly system: CalendarSystem;
  readonly year: number;
  /** 1-based month number (1..12, or 1..13 in some systems). */
  readonly month: number;
  /** 1-based day of month. */
  readonly day: number;
}

export type SelectionMode = 'single' | 'range' | 'multiple';

export type Direction = 'ltr' | 'rtl';

/** 0 = Sunday ... 6 = Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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

/**
 * Contract every calendar system must implement.
 * `epochDay` is the number of days since 1970-01-01 (Gregorian), which is
 * the single pivot used to convert between systems.
 */
export interface CalendarImplementation {
  readonly id: CalendarSystem;
  daysInMonth(year: number, month: number): number;
  monthsInYear(year: number): number;
  isLeapYear(year: number): boolean;
  toEpochDay(date: CalendarDate): number;
  fromEpochDay(epochDay: number): CalendarDate;
}

/** Context passed to plugin hooks. */
export interface PluginContext {
  readonly system: CalendarSystem;
  readonly locale: string;
}

/** Planned: extension point for calendars, holidays and market rules. */
export interface CalendarPlugin {
  readonly name: string;
  readonly calendars?: CalendarImplementation[];
  decorateDay?(date: CalendarDate, ctx: PluginContext): Record<string, unknown> | void;
  isDateUnavailable?(date: CalendarDate, ctx: PluginContext): boolean | void;
}

/** Options accepted by `createCalendar` and `Calendar.setOptions`. */
export interface CalendarOptions<M extends SelectionMode = 'single'> {
  /** Calendar system to display. Default: 'gregory'. */
  system?: CalendarSystem;
  /** BCP 47 locale for names and numerals, for example 'fa-IR', 'en-US', 'de-DE'. Default: 'en-US'. */
  locale?: string;
  /** Default: derived from the locale's language. */
  direction?: Direction;
  /** Default: first day of the week of the locale (falls back to Saturday for Persian, Sunday otherwise). */
  weekStart?: WeekStart;

  /** The date that decides the visible month. Default: today. */
  focusedDate?: CalendarDate;
  onFocusedDateChange?: (date: CalendarDate) => void;

  /**
   * The selected day. Passing it makes the calendar controlled: it only changes when you
   * pass a new value. `null` means "controlled, nothing selected". Leave it out for uncontrolled use.
   */
  value?: SelectionValue<M>;
  /** Initial selected day for an uncontrolled calendar. */
  defaultValue?: SelectionValue<M>;
  /** Called with the day the user selected, or `null` when the selection is cleared. */
  onChange?: (value: SelectionValue<M>) => void;

  /**
   * How days are selected: one day (default), a range with a start and an end, or any
   * number of separate days. The type of `value` and `onChange` follows this option.
   */
  selection?: M;
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

  /** Time zone used to decide what "today" is. Default: the runtime's time zone. */
  timeZone?: string;
  /** Clock used for "today". Inject a fixed clock in tests. Default: `() => new Date()`. */
  now?: () => Date;

  /** Plugins register calendar systems and decorate days. */
  plugins?: CalendarPlugin[];
}

/** One day in the month grid. */
export interface DayCell {
  readonly date: CalendarDate;
  /** Day number formatted for the locale ("14" or "۱۴"). */
  readonly label: string;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  /** Range mode: the first day of the range. */
  readonly isRangeStart: boolean;
  /** Range mode: the last day of the range. */
  readonly isRangeEnd: boolean;
  /** Range mode: a day between the first and the last day. */
  readonly isInRange: boolean;
  /** Range mode: a day of the range that would be chosen if the pointer or focus stays here. */
  readonly isInPreview: boolean;
  readonly isFocused: boolean;
  /** True for the days that belong to the previous or next month. */
  readonly isOutsideMonth: boolean;
  /** Outside the `minDate`..`maxDate` range. */
  readonly isDisabled: boolean;
  /** Marked by `isDateUnavailable` or a plugin. */
  readonly isUnavailable: boolean;
  /** Data added by plugins, for example `{ holiday: 'Nowruz' }`. */
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface WeekdayLabel {
  readonly short: string;
  readonly long: string;
}

/** One visible month of the calendar. */
export interface MonthGrid {
  readonly year: number;
  readonly month: number;
  /** For example "October 2026". */
  readonly label: string;
  /** Always 6 weeks of 7 days. `isOutsideMonth` is relative to this month. */
  readonly weeks: ReadonlyArray<ReadonlyArray<DayCell>>;
}

/** Read-only snapshot of a calendar. The same object is returned until something changes. */
export interface CalendarState<M extends SelectionMode = 'single'> {
  readonly system: CalendarSystem;
  readonly locale: string;
  readonly direction: Direction;
  readonly weekStart: WeekStart;
  /** The selection mode. */
  readonly selection: M;
  /** The selection, in the calendar system being displayed. */
  readonly value: SelectionValue<M>;
  /** Range mode: the first day of a range that is not complete yet. */
  readonly anchor: CalendarDate | null;
  readonly focusedDate: CalendarDate;
  readonly visibleMonth: { readonly year: number; readonly month: number };
  /** Always 6 weeks of 7 days, so the grid height never jumps between months. */
  readonly weeks: ReadonlyArray<ReadonlyArray<DayCell>>;
  /** Starts at `weekStart`. */
  readonly weekdayLabels: ReadonlyArray<WeekdayLabel>;
  /** For example "October 2026" or "مهر ۱۴۰۵". */
  readonly monthLabel: string;
  /** How many months are visible. */
  readonly visibleMonths: number;
  /** Every visible month. The first one is also described by `weeks`, `monthLabel` and the like. */
  readonly grids: ReadonlyArray<MonthGrid>;
  /** One label for all visible months: "October 2026" or "October 2026 – November 2026". */
  readonly visibleLabel: string;
  /** Which grid is shown: the days of the month, the months of the year or a page of years. */
  readonly view: CalendarView;
  /** Name of the visible month: "October", "مهر". */
  readonly monthName: string;
  /** The visible year with the numerals of the locale: "2026", "۱۴۰۵". */
  readonly yearLabel: string;
  /** The months of the visible year. */
  readonly months: ReadonlyArray<MonthCell>;
  /** A page of 12 years: the decade of the visible year plus one year on each side. */
  readonly years: ReadonlyArray<YearCell>;
  /** The decade of the page of years: "2020 – 2029". */
  readonly yearsLabel: string;
}

export interface Calendar<M extends SelectionMode = 'single'> {
  /** Current state. Safe to call often: the reference only changes when the state does. */
  getState(): CalendarState<M>;
  /** For adapters: `useSyncExternalStore`, Vue refs, Angular signals. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Merge new options, for example when component props change. */
  setOptions(options: Partial<CalendarOptions<M>>): void;

  nextMonth(): void;
  prevMonth(): void;
  nextYear(): void;
  prevYear(): void;
  /** Show the month that contains `date` (any calendar system) and focus it. */
  goTo(date: CalendarDate): void;
  goToToday(): void;

  /** Select a day (any calendar system). Ignored when the day is disabled or unavailable. */
  select(date: CalendarDate): void;
  /** Clear the selection. */
  clear(): void;
  /**
   * Range mode: show the range from the pending first day to `date`. Pass `null` to remove the
   * preview. Does nothing while no first day is pending. It never changes the value.
   */
  previewTo(date: CalendarDate | null): void;

  /**
   * Keyboard handling for the grid (ARIA grid pattern). Returns true, after calling
   * `event.preventDefault()`, when the key was handled. See `docs/adr/0006-selection-keyboard-props.md`.
   */
  handleKeyDown(event: KeyEventLike): boolean;

  getRootProps(): ElementProps<Record<string, never>>;
  /** Props for one visible month (`index` 0 is the first). All of them handle the keyboard. */
  getGridProps(index?: number): ElementProps<{ keydown: (event: KeyEventLike) => void }>;
  /** Props for one day cell. `date` can be in any calendar system. */
  getDayProps(date: CalendarDate): ElementProps<{ click: () => void }>;
  getPrevButtonProps(): ElementProps<{ click: () => void }>;
  getNextButtonProps(): ElementProps<{ click: () => void }>;

  /** Show the days, the months of the year or a page of years. */
  setView(view: CalendarView): void;
  /** Pick a month of the visible year and go back to the days. The day is clamped. */
  chooseMonth(month: number): void;
  /** Pick a year and go back to the days. The month stays, the day is clamped. */
  chooseYear(year: number): void;
  /** The button with the name of the month. It opens and closes the grid of months. */
  getMonthButtonProps(): ElementProps<{ click: () => void }>;
  /** The button with the year. It opens and closes the page of years. */
  getYearButtonProps(): ElementProps<{ click: () => void }>;
  /** Props for one month in the grid of months. */
  getMonthProps(month: number): ElementProps<{ click: () => void }>;
  /** Props for one year in the page of years. */
  getYearProps(year: number): ElementProps<{ click: () => void }>;

  /** Remove all listeners. */
  destroy(): void;
}

/** Texts the core puts on elements. */
export interface CalendarLabels {
  previousMonth: string;
  nextMonth: string;
}

/** Only the fields the core reads from a keyboard event, so it needs no DOM types. */
export interface KeyEventLike {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  preventDefault(): void;
}

export type AttributeValue = string | number | boolean | undefined;

/**
 * What a prop getter returns. `attrs` use DOM attribute names (`tabindex`, `aria-selected`,
 * `data-today`) and `handlers` use DOM event names (`click`, `keydown`), so every adapter
 * maps them to its own syntax. `undefined` attributes should be left off the element.
 */
export interface ElementProps<Handlers> {
  attrs: Record<string, AttributeValue>;
  handlers: Handlers;
}
