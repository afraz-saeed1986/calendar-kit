import { getCalendar, registerCalendar } from './calendars/registry';
import { addMonths, addYears, convertDate, weekdayOfEpochDay } from './date';
import type {
  Calendar,
  CalendarDate,
  CalendarOptions,
  CalendarPlugin,
  CalendarState,
  CalendarSystem,
  DayCell,
  Direction,
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

/**
 * Create a calendar: a small external store holding the visible month and everything
 * needed to render it. It knows nothing about the DOM or any framework.
 */
export function createCalendar(initial: CalendarOptions = {}): Calendar {
  let options: CalendarOptions = { ...initial };
  const listeners = new Set<() => void>();
  let snapshot: CalendarState | null = null;

  const getSystem = () => options.system ?? DEFAULT_SYSTEM;
  const getLocale = () => options.locale ?? DEFAULT_LOCALE;
  const getToday = () => todayEpochDay(options.now ?? (() => new Date()), options.timeZone);

  function registerPlugins(plugins: CalendarPlugin[] | undefined): void {
    for (const plugin of plugins ?? []) {
      for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
    }
  }

  registerPlugins(options.plugins);

  // Fails here, with a helpful message, if the system is unknown.
  let focused: CalendarDate = options.focusedDate
    ? convertDate(options.focusedDate, getSystem())
    : getCalendar(getSystem()).fromEpochDay(getToday());

  function emit(): void {
    snapshot = null;
    for (const listener of [...listeners]) listener();
  }

  function setFocused(date: CalendarDate): void {
    focused = date;
    emit();
    options.onFocusedDateChange?.(date);
  }

  function buildState(): CalendarState {
    const system = getSystem();
    const locale = getLocale();
    const cal = getCalendar(system);
    const weekStart = options.weekStart ?? defaultWeekStart(locale, system);
    const direction = options.direction ?? directionOf(locale);
    const plugins = options.plugins ?? [];
    const context: PluginContext = { system, locale };

    const today = getToday();
    const focusedEpoch = cal.toEpochDay(focused);
    const monthStart = cal.toEpochDay({ system, year: focused.year, month: focused.month, day: 1 });
    const monthLength = cal.daysInMonth(focused.year, focused.month);
    const leading = (weekdayOfEpochDay(monthStart) - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const gridStart = monthStart - leading;

    const min = options.minDate
      ? getCalendar(options.minDate.system).toEpochDay(options.minDate)
      : null;
    const max = options.maxDate
      ? getCalendar(options.maxDate.system).toEpochDay(options.maxDate)
      : null;
    const numbers = new Intl.NumberFormat(locale);

    const weeks: DayCell[][] = [];
    for (let week = 0; week < WEEKS_SHOWN; week++) {
      const row: DayCell[] = [];
      for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
        const epochDay = gridStart + week * DAYS_PER_WEEK + weekday;
        const date = cal.fromEpochDay(epochDay);
        const meta: Record<string, unknown> = {};
        let isUnavailable = options.isDateUnavailable?.(date) === true;

        for (const plugin of plugins) {
          const extra = plugin.decorateDay?.(date, context);
          if (extra) Object.assign(meta, extra);
          if (plugin.isDateUnavailable?.(date, context) === true) isUnavailable = true;
        }

        row.push({
          date,
          label: numbers.format(date.day),
          isToday: epochDay === today,
          isFocused: epochDay === focusedEpoch,
          isOutsideMonth: epochDay < monthStart || epochDay >= monthStart + monthLength,
          isDisabled: (min !== null && epochDay < min) || (max !== null && epochDay > max),
          isUnavailable,
          meta,
        });
      }
      weeks.push(row);
    }

    const intlLocale = new Intl.Locale(locale, { calendar: INTL_CALENDARS[system] ?? system });
    const monthLabel = new Intl.DateTimeFormat(intlLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(utcDate(monthStart));

    const shortNames = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    const longNames = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
    const weekdayLabels: WeekdayLabel[] = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
      const weekday = utcDate(SUNDAY + ((weekStart + i) % DAYS_PER_WEEK));
      weekdayLabels.push({ short: shortNames.format(weekday), long: longNames.format(weekday) });
    }

    return {
      system,
      locale,
      direction,
      weekStart,
      focusedDate: focused,
      visibleMonth: { year: focused.year, month: focused.month },
      weeks,
      weekdayLabels,
      monthLabel,
    };
  }

  return {
    getState() {
      snapshot ??= buildState();
      return snapshot;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setOptions(next) {
      const previousSystem = getSystem();
      options = { ...options, ...next };
      registerPlugins(next.plugins);

      const system = getSystem();
      if (next.focusedDate) {
        focused = convertDate(next.focusedDate, system);
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

    destroy() {
      listeners.clear();
    },
  };
}
