import { directionOf } from './locale';
import { timeLabelsFor } from './time-messages';
import type {
  HourCycle,
  TimeField,
  TimeFieldOptions,
  TimeFieldState,
  TimeSegment,
  TimeSegmentType,
  TimeValue,
} from './time-types';
import type { ElementProps, KeyEventLike } from './types';

const DEFAULT_LOCALE = 'en-US';
const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

const toSeconds = (time: TimeValue) => time.hour * 3600 + time.minute * 60 + time.second;
const mod = (n: number, m: number) => ((n % m) + m) % m;

function sameTime(a: TimeValue | null, b: TimeValue | null): boolean {
  if (a === null || b === null) return a === b;
  return toSeconds(a) === toSeconds(b);
}

/** Latin, Persian (۰-۹) and Arabic-Indic (٠-٩) digits all type the same number. */
function normalizeDigit(key: string): string | null {
  if (/^[0-9]$/.test(key)) return key;
  if (/^[۰-۹]$/.test(key)) return String(key.charCodeAt(0) - 0x06f0);
  if (/^[٠-٩]$/.test(key)) return String(key.charCodeAt(0) - 0x0660);
  return null;
}

function defaultHourCycle(locale: string): HourCycle {
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12' ? 12 : 24;
}

/** The locale's text for AM and PM. */
function periodTexts(locale: string): [string, string] {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hourCycle: 'h12',
    timeZone: 'UTC',
  });
  const read = (hour: number, fallback: string) =>
    formatter
      .formatToParts(new Date(Date.UTC(2000, 0, 1, hour)))
      .find((part) => part.type === 'dayPeriod')?.value ?? fallback;
  return [read(0, 'AM'), read(12, 'PM')];
}

function segmentRange(type: TimeSegmentType, cycle: HourCycle): { min: number; max: number } {
  if (type === 'hour') return cycle === 12 ? { min: 1, max: 12 } : { min: 0, max: 23 };
  if (type === 'period') return { min: 0, max: 1 };
  return { min: 0, max: 59 };
}

/** The number a segment shows: the 12-hour clock shows 12, 1, 2 ... 11; the period is 0 or 1. */
function displayValue(time: TimeValue, type: TimeSegmentType, cycle: HourCycle): number {
  if (type === 'hour') return cycle === 12 ? time.hour % 12 || 12 : time.hour;
  if (type === 'minute') return time.minute;
  if (type === 'second') return time.second;
  return time.hour >= 12 ? 1 : 0;
}

/** The time with one segment set to a displayed number (see `displayValue`). */
function withSegment(
  time: TimeValue,
  type: TimeSegmentType,
  n: number,
  cycle: HourCycle,
): TimeValue {
  if (type === 'hour') {
    return { ...time, hour: cycle === 12 ? (n % 12) + (time.hour >= 12 ? 12 : 0) : n };
  }
  if (type === 'minute') return { ...time, minute: n };
  if (type === 'second') return { ...time, second: n };
  return { ...time, hour: (time.hour % 12) + (n === 1 ? 12 : 0) };
}

/**
 * A time input made of segments (hour, minute, second, AM/PM), each one a spinbutton.
 * It holds no DOM: adapters render the segments and attach the props from `getSegmentProps`.
 */
export function createTimeField(initial: TimeFieldOptions = {}): TimeField {
  let options: TimeFieldOptions = { ...initial };
  let internalValue: TimeValue | null = options.defaultValue ?? null;
  let activeSegment: TimeSegmentType | null = null;
  /** Digits typed into the active segment so far, for "1" then "4" to make 14. */
  let buffer = '';
  const listeners = new Set<() => void>();

  const locale = () => options.locale ?? DEFAULT_LOCALE;
  const cycle = () => options.hourCycle ?? defaultHourCycle(locale());
  const currentValue = () => (options.value !== undefined ? options.value : internalValue);

  function segmentTypes(): TimeSegmentType[] {
    return [
      'hour',
      'minute',
      ...(options.showSeconds ? (['second'] as const) : []),
      ...(cycle() === 12 ? (['period'] as const) : []),
    ];
  }

  function buildState(): TimeFieldState {
    const loc = locale();
    const hourCycle = cycle();
    const value = currentValue();
    const labels = timeLabelsFor(loc, options.labels);
    const numbers = new Intl.NumberFormat(loc, { minimumIntegerDigits: 2, useGrouping: false });
    const [am, pm] = periodTexts(loc);

    const segments: TimeSegment[] = segmentTypes().map((type) => {
      const { min, max } = segmentRange(type, hourCycle);
      const numericValue = value ? displayValue(value, type, hourCycle) : null;
      let text = '--';
      if (numericValue !== null) {
        text = type === 'period' ? (numericValue === 1 ? pm : am) : numbers.format(numericValue);
      }
      return {
        type,
        text,
        isPlaceholder: numericValue === null,
        numericValue,
        min,
        max,
        label: labels[type],
      };
    });

    return {
      locale: loc,
      direction: directionOf(loc),
      hourCycle,
      value,
      segments,
      activeSegment,
    };
  }

  let state = buildState();

  function refresh(): void {
    state = buildState();
    for (const listener of [...listeners]) listener();
  }

  function inRange(time: TimeValue): boolean {
    if (options.minTime && toSeconds(time) < toSeconds(options.minTime)) return false;
    if (options.maxTime && toSeconds(time) > toSeconds(options.maxTime)) return false;
    return true;
  }

  /** Returns true when the value changed. A controlled field only reports the change. */
  function setValue(next: TimeValue | null): boolean {
    if (next !== null && !inRange(next)) return false;
    if (sameTime(next, currentValue())) return false;
    options.onChange?.(next);
    if (options.value === undefined) {
      internalValue = next;
      refresh();
    }
    return true;
  }

  function updateSegment(type: TimeSegmentType, n: number): boolean {
    const base = currentValue() ?? options.minTime ?? MIDNIGHT;
    return setValue(withSegment(base, type, n, cycle()));
  }

  function setActive(type: TimeSegmentType | null): void {
    if (activeSegment === type) return;
    activeSegment = type;
    buffer = '';
    refresh();
  }

  function stepOf(type: TimeSegmentType): number {
    const step =
      type === 'hour'
        ? options.hourStep
        : type === 'minute'
          ? options.minuteStep
          : type === 'second'
            ? options.secondStep
            : 1;
    return Math.max(1, Math.floor(step ?? 1));
  }

  function increment(type: TimeSegmentType, direction: 1 | -1): void {
    const current = currentValue();
    if (current === null) {
      setValue(options.minTime ?? MIDNIGHT);
      return;
    }
    const hourCycle = cycle();
    const { min, max } = segmentRange(type, hourCycle);
    const shown = displayValue(current, type, hourCycle);
    // Wraps inside the segment, without carrying into the next one: 59 minutes + 1 = 00.
    const next = min + mod(shown - min + direction * stepOf(type), max - min + 1);
    setValue(withSegment(current, type, next, hourCycle));
  }

  function typeDigit(type: TimeSegmentType, digit: string): void {
    const { min, max } = segmentRange(type, cycle());
    let typed = buffer + digit;
    if (Number(typed) > max) typed = digit; // too big: start again with this digit
    const n = Number(typed);

    // A lone 0 on a 12-hour clock is not a valid hour yet: wait for the next digit.
    if (n < min) {
      buffer = typed;
      return;
    }

    updateSegment(type, n);
    const complete = typed.length >= 2 || n * 10 > max;
    buffer = complete ? '' : typed;
    if (complete) {
      const types = segmentTypes();
      const next = types[types.indexOf(type) + 1];
      if (next) setActive(next);
    }
  }

  const field: TimeField = {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setOptions(partial) {
      const keys = Object.keys(partial) as Array<keyof TimeFieldOptions>;
      if (keys.every((key) => Object.is(options[key], partial[key]))) return;
      // Typed digits survive a new `value` (a parent re-renders after each digit), but not a
      // change that reshapes the segments.
      const reshaped = keys.some(
        (key) =>
          !Object.is(options[key], partial[key]) &&
          (key === 'locale' || key === 'hourCycle' || key === 'showSeconds'),
      );
      options = { ...options, ...partial };
      if (reshaped) buffer = '';
      refresh();
    },

    focusSegment: setActive,

    increment(type, direction) {
      buffer = '';
      increment(type, direction);
    },

    clear() {
      buffer = '';
      setValue(null);
    },

    handleKeyDown(type: TimeSegmentType, event: KeyEventLike): boolean {
      if (event.ctrlKey || event.metaKey || event.altKey) return false;
      if (activeSegment !== type) setActive(type);

      const { min, max } = segmentRange(type, cycle());
      const key = event.key;
      let handled = true;

      if (key === 'ArrowUp') {
        field.increment(type, 1);
      } else if (key === 'ArrowDown') {
        field.increment(type, -1);
      } else if (key === 'Home') {
        buffer = '';
        updateSegment(type, min);
      } else if (key === 'End') {
        buffer = '';
        updateSegment(type, max);
      } else if (key === 'Backspace' || key === 'Delete') {
        field.clear();
      } else if (type === 'period' && /^[ap]$/i.test(key)) {
        updateSegment('period', key.toLowerCase() === 'p' ? 1 : 0);
      } else {
        const digit = type === 'period' ? null : normalizeDigit(key);
        if (digit === null) handled = false;
        else typeDigit(type, digit);
      }

      if (handled) event.preventDefault();
      return handled;
    },

    getRootProps(): ElementProps<Record<string, never>> {
      return {
        attrs: {
          role: 'group',
          'aria-label': timeLabelsFor(state.locale, options.labels).time,
          // Times are read left to right, hour first, also in right-to-left languages.
          dir: 'ltr',
        },
        handlers: {},
      };
    },

    getSegmentProps(type) {
      const segment = state.segments.find((s) => s.type === type);
      if (!segment) throw new RangeError(`The "${type}" segment is not shown`);
      const labels = timeLabelsFor(state.locale, options.labels);

      return {
        attrs: {
          role: 'spinbutton',
          tabindex: 0,
          inputmode: type === 'period' ? undefined : 'numeric',
          'aria-label': segment.label,
          'aria-valuenow': segment.numericValue ?? undefined,
          'aria-valuemin': segment.min,
          'aria-valuemax': segment.max,
          'aria-valuetext': segment.isPlaceholder ? labels.empty : segment.text,
          'data-segment': type,
          'data-placeholder': segment.isPlaceholder ? true : undefined,
        },
        handlers: {
          keydown: (event: KeyEventLike) => {
            field.handleKeyDown(type, event);
          },
          focus: () => setActive(type),
        },
      };
    },

    destroy() {
      listeners.clear();
    },
  };

  return field;
}
