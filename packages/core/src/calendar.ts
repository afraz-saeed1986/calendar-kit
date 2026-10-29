import { getCalendar, registerCalendar } from './calendars/registry';
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  convertDate,
  isSameDay,
  weekdayOfEpochDay,
} from './date';
import { labelsFor } from './messages';
import type {
  Calendar,
  CalendarDate,
  CalendarImplementation,
  CalendarOptions,
  CalendarPlugin,
  CalendarState,
  CalendarSystem,
  DayCell,
  Direction,
  KeyEventLike,
  PluginContext,
  WeekdayLabel,
  WeekStart,
} from './types';

const MS_PER_DAY = 86_400_000;
const WEEKS_SHOWN = 6;
const DAYS_PER_WEEK = 7;
const SUNDAY = 3; // epoch day 3 (1970-01-04) was a Sunday

const DEFAULT_SYSTEM: CalendarSystem = 'gregory';
const DEFAULT_LOCALE = 'en-US';

/** Languages written right to left. */
const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

/** Intl calendar identifiers for our system ids. Unknown systems use their own id. */
const INTL_CALENDARS: Record<string, string> = {
  gregory: 'gregory',
  persian: 'persian',
  islamic: 'islamic',
};

type WeekInfoLocale = Intl.Locale & {
  getWeekInfo?: () => { firstDay: number };
  weekInfo?: { firstDay: number };
};

function directionOf(locale: string): Direction {
  return RTL_LANGUAGES.has(new Intl.Locale(locale).language) ? 'rtl' : 'ltr';
}

/**
 * First day of the week for a locale. Intl numbers days 1 (Monday) to 7 (Sunday),
 * we use 0 (Sunday) to 6 (Saturday). Older runtimes without week data fall back by system.
 */
function defaultWeekStart(locale: string, system: CalendarSystem): WeekStart {
  const intlLocale = new Intl.Locale(locale) as WeekInfoLocale;
  const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
  if (info) return (info.firstDay % 7) as WeekStart;
  return system === 'persian' ? 6 : 0;
}

/** Epoch day of "today" in the given time zone. */
function todayEpochDay(now: () => Date, timeZone: string | undefined): number {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now());
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return getCalendar('gregory').toEpochDay({
    system: 'gregory',
    year: read('year'),
    month: read('month'),
    day: read('day'),
  });
}

function utcDate(epochDay: number): Date {
  return new Date(epochDay * MS_PER_DAY);
}

/** Everything that is calculated once per state, so each day cell is cheap to build. */
interface View {
  system: CalendarSystem;
  locale: string;
  cal: CalendarImplementation;
  weekStart: WeekStart;
  direction: Direction;
  today: number;
  focusedEpoch: number;
  value: CalendarDate | null;
  selectedEpoch: number | null;
  monthStart: number;
  monthLength: number;
  min: number | null;
  max: number | null;
  numbers: Intl.NumberFormat;
  plugins: CalendarPlugin[];
  context: PluginContext;
}

/**
 * Create a calendar: a small external store holding the visible month, the selected day and
 * everything needed to render and operate it. It knows nothing about the DOM or any framework.
 */
export function createCalendar(initial: CalendarOptions = {}): Calendar {
  let options: CalendarOptions = { ...initial };
  const listeners = new Set<() => void>();
  let snapshot: CalendarState | null = null;
  let view: View | null = null;
  let internalValue: CalendarDate | null = options.defaultValue ?? null;
  let dayFormatter: { key: string; format: Intl.DateTimeFormat } | null = null;

  const getSystem = () => options.system ?? DEFAULT_SYSTEM;
  const getLocale = () => options.locale ?? DEFAULT_LOCALE;
  const getToday = () => todayEpochDay(options.now ?? (() => new Date()), options.timeZone);
  /** Controlled when `value` is passed (even as null), otherwise the value we keep ourselves. */
  const getValue = () => (options.value !== undefined ? options.value : internalValue);

  function registerPlugins(plugins: CalendarPlugin[] | undefined): void {
    for (const plugin of plugins ?? []) {
      for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
    }
  }

  registerPlugins(options.plugins);

  // Fails here, with a helpful message, if the system is unknown.
  const initialFocus = options.focusedDate ?? getValue();
  let focused: CalendarDate = initialFocus
    ? convertDate(initialFocus, getSystem())
    : getCalendar(getSystem()).fromEpochDay(getToday());

  function emit(): void {
    snapshot = null;
    view = null;
    for (const listener of [...listeners]) listener();
  }

  function setFocused(date: CalendarDate): void {
    focused = date;
    emit();
    options.onFocusedDateChange?.(date);
  }

  function getView(): View {
    if (view) return view;

    const system = getSystem();
    const locale = getLocale();
    const cal = getCalendar(system);
    const rawValue = getValue();
    const value = rawValue ? convertDate(rawValue, system) : null;
    const monthStart = cal.toEpochDay({ system, year: focused.year, month: focused.month, day: 1 });
    const { minDate, maxDate } = options;

    view = {
      system,
      locale,
      cal,
      weekStart: options.weekStart ?? defaultWeekStart(locale, system),
      direction: options.direction ?? directionOf(locale),
      today: getToday(),
      focusedEpoch: cal.toEpochDay(focused),
      value,
      selectedEpoch: value ? cal.toEpochDay(value) : null,
      monthStart,
      monthLength: cal.daysInMonth(focused.year, focused.month),
      min: minDate ? getCalendar(minDate.system).toEpochDay(minDate) : null,
      max: maxDate ? getCalendar(maxDate.system).toEpochDay(maxDate) : null,
      numbers: new Intl.NumberFormat(locale),
      plugins: options.plugins ?? [],
      context: { system, locale },
    };
    return view;
  }

  function makeCell(v: View, date: CalendarDate, epochDay: number): DayCell {
    const meta: Record<string, unknown> = {};
    let isUnavailable = options.isDateUnavailable?.(date) === true;

    for (const plugin of v.plugins) {
      const extra = plugin.decorateDay?.(date, v.context);
      if (extra) Object.assign(meta, extra);
      if (plugin.isDateUnavailable?.(date, v.context) === true) isUnavailable = true;
    }

    return {
      date,
      label: v.numbers.format(date.day),
      isToday: epochDay === v.today,
      isSelected: epochDay === v.selectedEpoch,
      isFocused: epochDay === v.focusedEpoch,
      isOutsideMonth: epochDay < v.monthStart || epochDay >= v.monthStart + v.monthLength,
      isDisabled: (v.min !== null && epochDay < v.min) || (v.max !== null && epochDay > v.max),
      isUnavailable,
      meta,
    };
  }

  function buildState(): CalendarState {
    const v = getView();
    const leading = (weekdayOfEpochDay(v.monthStart) - v.weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const gridStart = v.monthStart - leading;

    const weeks: DayCell[][] = [];
    for (let week = 0; week < WEEKS_SHOWN; week++) {
      const row: DayCell[] = [];
      for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
        const epochDay = gridStart + week * DAYS_PER_WEEK + weekday;
        row.push(makeCell(v, v.cal.fromEpochDay(epochDay), epochDay));
      }
      weeks.push(row);
    }

    const intlLocale = new Intl.Locale(v.locale, {
      calendar: INTL_CALENDARS[v.system] ?? v.system,
    });
    const monthLabel = new Intl.DateTimeFormat(intlLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(utcDate(v.monthStart));

    const shortNames = new Intl.DateTimeFormat(v.locale, { weekday: 'short', timeZone: 'UTC' });
    const longNames = new Intl.DateTimeFormat(v.locale, { weekday: 'long', timeZone: 'UTC' });
    const weekdayLabels: WeekdayLabel[] = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
      const weekday = utcDate(SUNDAY + ((v.weekStart + i) % DAYS_PER_WEEK));
      weekdayLabels.push({ short: shortNames.format(weekday), long: longNames.format(weekday) });
    }

    return {
      system: v.system,
      locale: v.locale,
      direction: v.direction,
      weekStart: v.weekStart,
      value: v.value,
      focusedDate: focused,
      visibleMonth: { year: focused.year, month: focused.month },
      weeks,
      weekdayLabels,
      monthLabel,
    };
  }

  function getState(): CalendarState {
    snapshot ??= buildState();
    return snapshot;
  }

  /** "Wednesday, October 14, 2026" in the active locale and calendar. */
  function formatDay(v: View, epochDay: number): string {
    const key = `${v.system}|${v.locale}`;
    if (dayFormatter?.key !== key) {
      const intlLocale = new Intl.Locale(v.locale, {
        calendar: INTL_CALENDARS[v.system] ?? v.system,
      });
      dayFormatter = {
        key,
        format: new Intl.DateTimeFormat(intlLocale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      };
    }
    return dayFormatter.format.format(utcDate(epochDay));
  }

  // --- Selection ---

  function commitValue(date: CalendarDate | null): void {
    const previousFocus = focused;
    if (options.value === undefined) internalValue = date;
    if (date) focused = date;
    emit();
    options.onChange?.(date);
    if (date && !isSameDay(previousFocus, date)) options.onFocusedDateChange?.(date);
  }

  function select(date: CalendarDate): void {
    const v = getView();
    const target = convertDate(date, v.system);
    const cell = makeCell(v, target, v.cal.toEpochDay(target));
    if (cell.isDisabled || cell.isUnavailable) return;
    commitValue(target);
  }

  function clear(): void {
    if (getValue() === null) return;
    commitValue(null);
  }

  // --- Keyboard ---

  function moveFocus(event: KeyEventLike, date: CalendarDate): boolean {
    event.preventDefault();
    setFocused(date);
    return true;
  }

  function handleKeyDown(event: KeyEventLike): boolean {
    // Leave browser and system shortcuts alone.
    if (event.ctrlKey || event.metaKey || event.altKey) return false;

    const v = getView();
    // In right-to-left languages the right arrow goes back in time.
    const forward = v.direction === 'rtl' ? -1 : 1;
    const offsetInWeek =
      (weekdayOfEpochDay(v.focusedEpoch) - v.weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;

    switch (event.key) {
      case 'ArrowRight':
        return moveFocus(event, addDays(focused, forward));
      case 'ArrowLeft':
        return moveFocus(event, addDays(focused, -forward));
      case 'ArrowDown':
        return moveFocus(event, addDays(focused, DAYS_PER_WEEK));
      case 'ArrowUp':
        return moveFocus(event, addDays(focused, -DAYS_PER_WEEK));
      case 'Home':
        return moveFocus(event, addDays(focused, -offsetInWeek));
      case 'End':
        return moveFocus(event, addDays(focused, DAYS_PER_WEEK - 1 - offsetInWeek));
      case 'PageDown':
        return moveFocus(event, event.shiftKey ? addYears(focused, 1) : addMonths(focused, 1));
      case 'PageUp':
        return moveFocus(event, event.shiftKey ? addYears(focused, -1) : addMonths(focused, -1));
      case 'Enter':
      case ' ':
        event.preventDefault();
        select(focused);
        return true;
      default:
        return false;
    }
  }

  return {
    getState,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setOptions(next) {
      const keys = Object.keys(next) as (keyof CalendarOptions)[];
      // Adapters call this on every render, so doing nothing for unchanged options matters.
      if (keys.every((key) => Object.is(options[key], next[key]))) return;

      const previousSystem = getSystem();
      const previousValue = getValue();
      options = { ...options, ...next };
      registerPlugins(next.plugins);

      const system = getSystem();
      const value = getValue();
      const valueChanged =
        value !== null && (previousValue === null || compareDates(previousValue, value) !== 0);

      if (next.focusedDate) {
        focused = convertDate(next.focusedDate, system);
      } else if (valueChanged) {
        // Show the new value. An unchanged value must not pull the user back from other months.
        focused = convertDate(value, system);
      } else if (system !== previousSystem) {
        focused = convertDate(focused, system);
      }
      emit();
    },

    nextMonth: () => setFocused(addMonths(focused, 1)),
    prevMonth: () => setFocused(addMonths(focused, -1)),
    nextYear: () => setFocused(addYears(focused, 1)),
    prevYear: () => setFocused(addYears(focused, -1)),
    goTo: (date) => setFocused(convertDate(date, getSystem())),
    goToToday: () => setFocused(getCalendar(getSystem()).fromEpochDay(getToday())),

    select,
    clear,
    handleKeyDown,

    getRootProps() {
      const v = getView();
      return {
        attrs: { role: 'group', 'aria-label': getState().monthLabel, dir: v.direction },
        handlers: {},
      };
    },

    getGridProps() {
      return {
        attrs: { role: 'grid', 'aria-label': getState().monthLabel },
        handlers: {
          keydown: (event) => {
            handleKeyDown(event);
          },
        },
      };
    },

    getDayProps(date) {
      const v = getView();
      const target = convertDate(date, v.system);
      const epochDay = v.cal.toEpochDay(target);
      const cell = makeCell(v, target, epochDay);
      return {
        attrs: {
          role: 'gridcell',
          // Only the focused day is in the tab order; arrow keys move between days.
          tabindex: cell.isFocused ? 0 : -1,
          'aria-selected': cell.isSelected,
          'aria-disabled': cell.isDisabled || cell.isUnavailable ? true : undefined,
          'aria-current': cell.isToday ? 'date' : undefined,
          'aria-label': formatDay(v, epochDay),
          'data-today': cell.isToday || undefined,
          'data-selected': cell.isSelected || undefined,
          'data-focused': cell.isFocused || undefined,
          'data-outside-month': cell.isOutsideMonth || undefined,
          'data-disabled': cell.isDisabled || undefined,
          'data-unavailable': cell.isUnavailable || undefined,
        },
        handlers: { click: () => select(target) },
      };
    },

    getPrevButtonProps() {
      return {
        attrs: {
          type: 'button',
          'aria-label': labelsFor(getLocale(), options.labels).previousMonth,
        },
        handlers: { click: () => setFocused(addMonths(focused, -1)) },
      };
    },

    getNextButtonProps() {
      return {
        attrs: { type: 'button', 'aria-label': labelsFor(getLocale(), options.labels).nextMonth },
        handlers: { click: () => setFocused(addMonths(focused, 1)) },
      };
    },

    destroy() {
      listeners.clear();
    },
  };
}
