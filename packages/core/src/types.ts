/**
 * Public types of @calendar-kit/core.
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
