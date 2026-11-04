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
import { directionOf } from './locale';
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
  ElementProps,
  KeyEventLike,
  PluginContext,
  WeekdayLabel,
  WeekStart,
} from './types';
import { viewLabelsFor } from './view-messages';
import type { CalendarView, MonthCell, YearCell } from './view-types';
import { GRID_COLUMNS, YEARS_PER_DECADE, decadeStart, withMonth, yearPageOf } from './views';

const MS_PER_DAY = 86_400_000;
const WEEKS_SHOWN = 6;
const DAYS_PER_WEEK = 7;
const SUNDAY = 3; // epoch day 3 (1970-01-04) was a Sunday

const DEFAULT_SYSTEM: CalendarSystem = 'gregory';
const DEFAULT_LOCALE = 'en-US';

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

/** First and last epoch day of a month. */
function monthRange(v: View, year: number, month: number): [number, number] {
  const start = v.cal.toEpochDay({ system: v.system, year, month, day: 1 });
  return [start, start + v.cal.daysInMonth(year, month) - 1];
}

/** First and last epoch day of a year. */
function yearRange(v: View, year: number): [number, number] {
  const [start] = monthRange(v, year, 1);
  const [, end] = monthRange(v, year, v.cal.monthsInYear(year));
  return [start, end];
}

/** True when no day of the range is inside `minDate` and `maxDate`. */
function isOutOfBounds(v: View, [start, end]: [number, number]): boolean {
  return (v.min !== null && end < v.min) || (v.max !== null && start > v.max);
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
  let currentView: CalendarView = 'days';
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

    // Months and years: the name of a month alone, and years without a thousands separator.
    const monthNames = new Intl.DateTimeFormat(intlLocale, { month: 'long', timeZone: 'UTC' });
    const monthName = (epochDay: number) =>
      monthNames.formatToParts(utcDate(epochDay)).find((part) => part.type === 'month')?.value ??
      '';
    const yearNumbers = new Intl.NumberFormat(v.locale, { useGrouping: false });
    const todayDate = v.cal.fromEpochDay(v.today);

    const months: MonthCell[] = [];
    for (let month = 1; month <= v.cal.monthsInYear(focused.year); month++) {
      const range = monthRange(v, focused.year, month);
      months.push({
        month,
        label: monthName(range[0]),
        isCurrent: todayDate.year === focused.year && todayDate.month === month,
        isSelected: v.value !== null && v.value.year === focused.year && v.value.month === month,
        isFocused: focused.month === month,
        isDisabled: isOutOfBounds(v, range),
      });
    }

    const page = yearPageOf(focused.year);
    const years: YearCell[] = page.map((year, index) => ({
      year,
      label: yearNumbers.format(year),
      isCurrent: todayDate.year === year,
      isSelected: v.value !== null && v.value.year === year,
      isFocused: focused.year === year,
      isDisabled: isOutOfBounds(v, yearRange(v, year)),
      isOutsideDecade: index === 0 || index === page.length - 1,
    }));

    const decade = decadeStart(focused.year);

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
      view: currentView,
      monthName: monthName(v.monthStart),
      yearLabel: yearNumbers.format(focused.year),
      months,
      years,
      yearsLabel: `${yearNumbers.format(decade)} – ${yearNumbers.format(decade + YEARS_PER_DECADE - 1)}`,
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

  // --- Months and years ---

  function setView(next: CalendarView): void {
    if (currentView === next) return;
    currentView = next;
    emit();
  }

  /** The same button opens its grid and closes it again. */
  function toggleView(target: 'months' | 'years'): void {
    setView(currentView === target ? 'days' : target);
  }

  function chooseMonth(month: number): void {
    const v = getView();
    if (month < 1 || month > v.cal.monthsInYear(focused.year)) return;
    if (isOutOfBounds(v, monthRange(v, focused.year, month))) return;
    currentView = 'days';
    setFocused(withMonth(focused, focused.year, month));
  }

  function chooseYear(year: number): void {
    const v = getView();
    if (isOutOfBounds(v, yearRange(v, year))) return;
    currentView = 'days';
    setFocused(withMonth(focused, year, Math.min(focused.month, v.cal.monthsInYear(year))));
  }

  /** The previous and next buttons move by a month, a year or ten years, depending on the view. */
  function stepBy(direction: 1 | -1): void {
    if (currentView === 'days') setFocused(addMonths(focused, direction));
    else if (currentView === 'months') setFocused(addYears(focused, direction));
    else setFocused(addYears(focused, direction * YEARS_PER_DECADE));
  }

  function stepProps(direction: 1 | -1): ElementProps<{ click: () => void }> {
    const labels = labelsFor(getLocale(), options.labels);
    const viewLabels = viewLabelsFor(getLocale(), options.labels);
    const backwards = direction < 0;
    let name = backwards ? labels.previousMonth : labels.nextMonth;
    if (currentView === 'months') name = backwards ? viewLabels.previousYear : viewLabels.nextYear;
    if (currentView === 'years') {
      name = backwards ? viewLabels.previousDecade : viewLabels.nextDecade;
    }
    return {
      attrs: { type: 'button', 'aria-label': name },
      handlers: { click: () => stepBy(direction) },
    };
  }

  // --- Keyboard ---

  function moveFocus(event: KeyEventLike, date: CalendarDate): boolean {
    event.preventDefault();
    setFocused(date);
    return true;
  }

  /** Keys in the grid of months and in the page of years. Both have three columns. */
  function handleViewKeyDown(event: KeyEventLike, v: View): boolean {
    const forward = v.direction === 'rtl' ? -1 : 1;
    const inYears = currentView === 'years';
    const step = (n: number) => (inYears ? addYears(focused, n) : addMonths(focused, n));
    const decade = decadeStart(focused.year);

    switch (event.key) {
      case 'ArrowRight':
        return moveFocus(event, step(forward));
      case 'ArrowLeft':
        return moveFocus(event, step(-forward));
      case 'ArrowDown':
        return moveFocus(event, step(GRID_COLUMNS));
      case 'ArrowUp':
        return moveFocus(event, step(-GRID_COLUMNS));
      case 'PageDown':
        return moveFocus(event, addYears(focused, inYears ? YEARS_PER_DECADE : 1));
      case 'PageUp':
        return moveFocus(event, addYears(focused, inYears ? -YEARS_PER_DECADE : -1));
      case 'Home':
        return moveFocus(
          event,
          inYears
            ? withMonth(focused, decade, Math.min(focused.month, v.cal.monthsInYear(decade)))
            : withMonth(focused, focused.year, 1),
        );
      case 'End': {
        const lastYear = decade + YEARS_PER_DECADE - 1;
        return moveFocus(
          event,
          inYears
            ? withMonth(focused, lastYear, Math.min(focused.month, v.cal.monthsInYear(lastYear)))
            : withMonth(focused, focused.year, v.cal.monthsInYear(focused.year)),
        );
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (inYears) chooseYear(focused.year);
        else chooseMonth(focused.month);
        return true;
      case 'Escape':
        // Back to the days. A picker around the calendar can tell this key was used.
        event.preventDefault();
        setView('days');
        return true;
      default:
        return false;
    }
  }

  function handleKeyDown(event: KeyEventLike): boolean {
    // Leave browser and system shortcuts alone.
    if (event.ctrlKey || event.metaKey || event.altKey) return false;

    const v = getView();
    if (currentView !== 'days') return handleViewKeyDown(event, v);

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

    setView,
    chooseMonth,
    chooseYear,

    getRootProps() {
      const v = getView();
      return {
        attrs: { role: 'group', 'aria-label': getState().monthLabel, dir: v.direction },
        handlers: {},
      };
    },

    getGridProps() {
      const state = getState();
      const label =
        currentView === 'days'
          ? state.monthLabel
          : currentView === 'months'
            ? state.yearLabel
            : state.yearsLabel;
      return {
        attrs: { role: 'grid', 'aria-label': label },
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

    getPrevButtonProps: () => stepProps(-1),
    getNextButtonProps: () => stepProps(1),

    getMonthButtonProps() {
      const state = getState();
      const { chooseMonth: name } = viewLabelsFor(getLocale(), options.labels);
      return {
        attrs: {
          type: 'button',
          // The visible text (the name of the month) is part of the accessible name.
          'aria-label': `${state.monthName}, ${name}`,
          'aria-expanded': currentView === 'months',
        },
        handlers: { click: () => toggleView('months') },
      };
    },

    getYearButtonProps() {
      const state = getState();
      const { chooseYear: name } = viewLabelsFor(getLocale(), options.labels);
      return {
        attrs: {
          type: 'button',
          'aria-label': `${currentView === 'years' ? state.yearsLabel : state.yearLabel}, ${name}`,
          'aria-expanded': currentView === 'years',
        },
        handlers: { click: () => toggleView('years') },
      };
    },

    getMonthProps(month) {
      const state = getState();
      const cell = state.months.find((item) => item.month === month);
      if (!cell) throw new RangeError(`Month ${month} is not in the visible year`);
      return {
        attrs: {
          role: 'gridcell',
          tabindex: cell.isFocused ? 0 : -1,
          'aria-selected': cell.isSelected,
          'aria-disabled': cell.isDisabled ? true : undefined,
          'aria-current': cell.isCurrent ? 'date' : undefined,
          'aria-label': `${cell.label} ${state.yearLabel}`,
          'data-current': cell.isCurrent || undefined,
          'data-selected': cell.isSelected || undefined,
          'data-focused': cell.isFocused || undefined,
          'data-disabled': cell.isDisabled || undefined,
        },
        handlers: { click: () => chooseMonth(month) },
      };
    },

    getYearProps(year) {
      const cell = getState().years.find((item) => item.year === year);
      if (!cell) throw new RangeError(`Year ${year} is not on the visible page`);
      return {
        attrs: {
          role: 'gridcell',
          tabindex: cell.isFocused ? 0 : -1,
          'aria-selected': cell.isSelected,
          'aria-disabled': cell.isDisabled ? true : undefined,
          'aria-current': cell.isCurrent ? 'date' : undefined,
          'aria-label': cell.label,
          'data-current': cell.isCurrent || undefined,
          'data-selected': cell.isSelected || undefined,
          'data-focused': cell.isFocused || undefined,
          'data-disabled': cell.isDisabled || undefined,
          'data-outside-decade': cell.isOutsideDecade || undefined,
        },
        handlers: { click: () => chooseYear(year) },
      };
    },

    destroy() {
      listeners.clear();
    },
  };
}
