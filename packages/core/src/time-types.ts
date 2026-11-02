import type { CalendarDate, Direction, ElementProps, KeyEventLike } from './types';

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

export type HourCycle = 12 | 24;

export type TimeSegmentType = 'hour' | 'minute' | 'second' | 'period';

/** Texts the time field puts on elements. */
export interface TimeFieldLabels {
  time: string;
  hour: string;
  minute: string;
  second: string;
  /** AM/PM. */
  period: string;
  /** Spoken for a segment that has no value yet. */
  empty: string;
}

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

/** One editable part of the time: hour, minute, second or AM/PM. */
export interface TimeSegment {
  readonly type: TimeSegmentType;
  /** The shown text: "09", "05", "PM", or "--" when empty. */
  readonly text: string;
  readonly isPlaceholder: boolean;
  /** For `aria-valuenow`. For the period, 0 is AM and 1 is PM. `null` when empty. */
  readonly numericValue: number | null;
  readonly min: number;
  readonly max: number;
  readonly label: string;
}

export interface TimeFieldState {
  readonly locale: string;
  readonly direction: Direction;
  readonly hourCycle: HourCycle;
  readonly value: TimeValue | null;
  /** In display order for the locale. */
  readonly segments: ReadonlyArray<TimeSegment>;
  readonly activeSegment: TimeSegmentType | null;
}

export interface TimeField {
  getState(): TimeFieldState;
  subscribe(listener: () => void): () => void;
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
