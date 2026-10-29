/**
 * Public types of @calendrix/core.
 *
 * The full design rationale lives in docs/api.md and docs/adr/.
 * Types marked "planned" describe the contract of `createCalendar`,
 * which is implemented in a later milestone (see docs/roadmap.md).
 */

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
export interface CalendarOptions {
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
  value?: CalendarDate | null;
  /** Initial selected day for an uncontrolled calendar. */
  defaultValue?: CalendarDate | null;
  /** Called with the day the user selected, or `null` when the selection is cleared. */
  onChange?: (value: CalendarDate | null) => void;

  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  /** Mark specific days as not selectable, for example market holidays. */
  isDateUnavailable?: (date: CalendarDate) => boolean;

  /** Texts for buttons. Defaults come from the locale (English, Persian and German are built in). */
  labels?: Partial<CalendarLabels>;

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

/** Read-only snapshot of a calendar. The same object is returned until something changes. */
export interface CalendarState {
  readonly system: CalendarSystem;
  readonly locale: string;
  readonly direction: Direction;
  readonly weekStart: WeekStart;
  /** The selected day, in the calendar system being displayed. */
  readonly value: CalendarDate | null;
  readonly focusedDate: CalendarDate;
  readonly visibleMonth: { readonly year: number; readonly month: number };
  /** Always 6 weeks of 7 days, so the grid height never jumps between months. */
  readonly weeks: ReadonlyArray<ReadonlyArray<DayCell>>;
  /** Starts at `weekStart`. */
  readonly weekdayLabels: ReadonlyArray<WeekdayLabel>;
  /** For example "October 2026" or "مهر ۱۴۰۵". */
  readonly monthLabel: string;
}

export interface Calendar {
  /** Current state. Safe to call often: the reference only changes when the state does. */
  getState(): CalendarState;
  /** For adapters: `useSyncExternalStore`, Vue refs, Angular signals. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Merge new options, for example when component props change. */
  setOptions(options: Partial<CalendarOptions>): void;

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
   * Keyboard handling for the grid (ARIA grid pattern). Returns true, after calling
   * `event.preventDefault()`, when the key was handled. See `docs/adr/0006-selection-keyboard-props.md`.
   */
  handleKeyDown(event: KeyEventLike): boolean;

  getRootProps(): ElementProps<Record<string, never>>;
  getGridProps(): ElementProps<{ keydown: (event: KeyEventLike) => void }>;
  /** Props for one day cell. `date` can be in any calendar system. */
  getDayProps(date: CalendarDate): ElementProps<{ click: () => void }>;
  getPrevButtonProps(): ElementProps<{ click: () => void }>;
  getNextButtonProps(): ElementProps<{ click: () => void }>;

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
