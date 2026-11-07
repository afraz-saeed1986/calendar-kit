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
  DateRange,
  DayCell,
  Direction,
  ElementProps,
  KeyEventLike,
  MonthGrid,
  PluginContext,
  Selection,
  SelectionMode,
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
const MAX_VISIBLE_MONTHS = 3;

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

/** How many months are visible: 1 to 3, whatever the caller passed. */
function clampMonths(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(MAX_VISIBLE_MONTHS, Math.max(1, Math.floor(value)));
}

/** The first day of the month of a date. */
function firstOfMonth(date: CalendarDate): CalendarDate {
  return { system: date.system, year: date.year, month: date.month, day: 1 };
}

/** Orders months of one calendar system: no month has a number above 99. */
const monthKey = (date: { year: number; month: number }): number => date.year * 100 + date.month;

// --- Selection values ---

const dateKey = (date: CalendarDate): number => getCalendar(date.system).toEpochDay(date);

function isRange(value: unknown): value is DateRange {
  return typeof value === 'object' && value !== null && 'start' in value && 'end' in value;
}

/** What "nothing selected" looks like in a mode. */
function emptyValue(mode: SelectionMode): Selection {
  return mode === 'multiple' ? [] : null;
}

function isEmptySelection(value: Selection | undefined): boolean {
  if (value === null || value === undefined) return true;
  return Array.isArray(value) && value.length === 0;
}

/** The earliest day of a selection, used to decide which month to show. */
function firstDateOf(value: Selection | undefined): CalendarDate | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  if (isRange(value)) return value.start;
  return value;
}

/** A string that is equal for equal selections, whatever calendar system they are written in. */
function selectionKey(value: Selection | undefined): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(dateKey).join(',');
  if (isRange(value)) return `${dateKey(value.start)}~${dateKey(value.end)}`;
  return String(dateKey(value));
}

/**
 * The value as the calendar shows it: in the displayed system, a range with its ends in order,
 * a list sorted and without duplicates. A value of the wrong shape for the mode means "nothing".
 */
function normalizeSelection(
  mode: SelectionMode,
  raw: Selection | undefined,
  system: CalendarSystem,
): Selection {
  if (mode === 'multiple') {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<number>();
    const list: CalendarDate[] = [];
    for (const item of raw) {
      const date = convertDate(item, system);
      const key = dateKey(date);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(date);
    }
    return list.sort(compareDates);
  }
  if (mode === 'range') {
    if (!isRange(raw)) return null;
    const start = convertDate(raw.start, system);
    const end = convertDate(raw.end, system);
    return compareDates(start, end) > 0 ? { start: end, end: start } : { start, end };
  }
  if (raw === null || raw === undefined || Array.isArray(raw) || isRange(raw)) return null;
  return convertDate(raw, system);
}

/** A visible month: where it starts and how long it is. */
interface GridInfo {
  year: number;
  month: number;
  /** Epoch day of its first day. */
  start: number;
  length: number;
}

/** Everything that is calculated once per state, so each day cell is cheap to build. */
interface View {
  system: CalendarSystem;
  locale: string;
  cal: CalendarImplementation;
  mode: SelectionMode;
  weekStart: WeekStart;
  direction: Direction;
  today: number;
  focusedEpoch: number;
  /** The committed selection, in the displayed system. */
  value: Selection;
  /** Epoch days that are shown as selected: one day, or the ends of a range. */
  selectedFrom: number | null;
  selectedTo: number | null;
  /** Multiple mode: the selected days. */
  selectedSet: Set<number> | null;
  /** Epoch days that decide which months and years are marked as selected. */
  marks: number[];
  /** Range mode: the range that is drawn (a pending start and its preview, or the value). */
  rangeFrom: number | null;
  rangeTo: number | null;
  previewing: boolean;
  /** The first visible month. */
  first: GridInfo;
  /** Every visible month, the first one included. */
  grids: GridInfo[];
  /** All visible months together: the days outside of it are outside every month. */
  span: { start: number; length: number };
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

/** True when a selected day (or an end of the selected range) is inside the range. */
function touchesSelection(v: View, [start, end]: [number, number]): boolean {
  return v.marks.some((epochDay) => epochDay >= start && epochDay <= end);
}

/**
 * Create a calendar: a small external store holding the visible months, the selected days and
 * everything needed to render and operate it. It knows nothing about the DOM or any framework.
 * The `selection` option picks one day (default), a range or any number of days, and
 * `visibleMonths` shows one, two or three months at once.
 */
export function createCalendar<M extends SelectionMode = 'single'>(
  initial: CalendarOptions<M> = {},
): Calendar<M> {
  // Inside, the mode is the union of all modes; the signature above gives callers the exact type.
  let options = { ...initial } as unknown as CalendarOptions<SelectionMode>;
  const listeners = new Set<() => void>();
  let snapshot: CalendarState<SelectionMode> | null = null;
  let view: View | null = null;
  let currentView: CalendarView = 'days';
  /** Range mode: the first day of a range that is not complete yet. */
  let anchor: CalendarDate | null = null;
  /** Range mode: epoch day of the day the pointer or focus is on while an anchor is pending. */
  let previewEpoch: number | null = null;
  let dayFormatter: { key: string; format: Intl.DateTimeFormat } | null = null;

  const getSystem = () => options.system ?? DEFAULT_SYSTEM;
  const getLocale = () => options.locale ?? DEFAULT_LOCALE;
  const getMode = (): SelectionMode => options.selection ?? 'single';
  const getVisibleCount = () => clampMonths(options.visibleMonths);
  const getToday = () => todayEpochDay(options.now ?? (() => new Date()), options.timeZone);

  let internalValue: Selection = options.defaultValue ?? emptyValue(getMode());
  /** Controlled when `value` is passed (even as null), otherwise the value we keep ourselves. */
  const getRawValue = (): Selection =>
    options.value !== undefined ? options.value : internalValue;

  function registerPlugins(plugins: CalendarPlugin[] | undefined): void {
    for (const plugin of plugins ?? []) {
      for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
    }
  }

  registerPlugins(options.plugins);

  // Fails here, with a helpful message, if the system is unknown.
  const initialFocus = options.focusedDate ?? firstDateOf(getRawValue());
  let focused: CalendarDate = initialFocus
    ? convertDate(initialFocus, getSystem())
    : getCalendar(getSystem()).fromEpochDay(getToday());
  /** The first visible month. The focused day is always inside the visible months. */
  let shown: CalendarDate = firstOfMonth(focused);

  function emit(): void {
    snapshot = null;
    view = null;
    for (const listener of [...listeners]) listener();
  }

  /** Make sure the focused day is visible, moving the visible months as little as possible. */
  function reveal(): void {
    const count = getVisibleCount();
    const key = monthKey(focused);
    if (key < monthKey(shown)) {
      shown = firstOfMonth(focused);
    } else if (key > monthKey(addMonths(shown, count - 1))) {
      shown = firstOfMonth(addMonths(focused, -(count - 1)));
    }
  }

  /** Focus a day. The visible months move only when the day is not visible. */
  function setFocused(date: CalendarDate): void {
    focused = date;
    // The months and years views always work on the first visible month.
    if (currentView === 'days') reveal();
    else shown = firstOfMonth(date);
    emit();
    options.onFocusedDateChange?.(date);
  }

  /** Focus a day and show its month first. */
  function showFocused(date: CalendarDate): void {
    focused = date;
    shown = firstOfMonth(date);
    emit();
    options.onFocusedDateChange?.(date);
  }

  /** Move the visible months and the focus by whole months. */
  function shift(delta: number, followPreview = false): void {
    const next = addMonths(focused, delta);
    shown = firstOfMonth(addMonths(shown, delta));
    if (followPreview && getMode() === 'range' && anchor !== null) {
      previewEpoch = getCalendar(getSystem()).toEpochDay(next);
    }
    focused = next;
    emit();
    options.onFocusedDateChange?.(next);
  }

  function getView(): View {
    if (view) return view;

    const system = getSystem();
    const locale = getLocale();
    const cal = getCalendar(system);
    const mode = getMode();
    const value = normalizeSelection(mode, getRawValue(), system);
    const { minDate, maxDate } = options;

    const grids: GridInfo[] = [];
    for (let index = 0; index < getVisibleCount(); index++) {
      const date = addMonths(shown, index);
      grids.push({
        year: date.year,
        month: date.month,
        start: cal.toEpochDay({ system, year: date.year, month: date.month, day: 1 }),
        length: cal.daysInMonth(date.year, date.month),
      });
    }
    const first = grids[0];
    const last = grids[grids.length - 1];
    if (!first || !last) throw new Error('A calendar shows at least one month');

    let selectedFrom: number | null = null;
    let selectedTo: number | null = null;
    let selectedSet: Set<number> | null = null;
    let marks: number[] = [];
    let rangeFrom: number | null = null;
    let rangeTo: number | null = null;

    if (mode === 'single' && value && !Array.isArray(value) && !isRange(value)) {
      selectedFrom = selectedTo = cal.toEpochDay(value);
      marks = [selectedFrom];
    } else if (mode === 'range') {
      if (anchor) {
        // A range in the making: only its first day is selected, the rest is drawn as a preview.
        const start = cal.toEpochDay(anchor);
        const other = previewEpoch ?? start;
        selectedFrom = selectedTo = start;
        marks = [start];
        rangeFrom = Math.min(start, other);
        rangeTo = Math.max(start, other);
      } else if (isRange(value)) {
        selectedFrom = rangeFrom = cal.toEpochDay(value.start);
        selectedTo = rangeTo = cal.toEpochDay(value.end);
        marks = [selectedFrom, selectedTo];
      }
    } else if (mode === 'multiple' && Array.isArray(value)) {
      marks = value.map((date) => cal.toEpochDay(date));
      selectedSet = new Set(marks);
    }

    view = {
      system,
      locale,
      cal,
      mode,
      weekStart: options.weekStart ?? defaultWeekStart(locale, system),
      direction: options.direction ?? directionOf(locale),
      today: getToday(),
      focusedEpoch: cal.toEpochDay(focused),
      value,
      selectedFrom,
      selectedTo,
      selectedSet,
      marks,
      rangeFrom,
      rangeTo,
      previewing: mode === 'range' && anchor !== null && previewEpoch !== null,
      first,
      grids,
      span: { start: first.start, length: last.start + last.length - first.start },
      min: minDate ? getCalendar(minDate.system).toEpochDay(minDate) : null,
      max: maxDate ? getCalendar(maxDate.system).toEpochDay(maxDate) : null,
      numbers: new Intl.NumberFormat(locale),
      plugins: options.plugins ?? [],
      context: { system, locale },
    };
    return view;
  }

  function makeCell(
    v: View,
    date: CalendarDate,
    epochDay: number,
    month: { start: number; length: number } = v.span,
  ): DayCell {
    const meta: Record<string, unknown> = {};
    let isUnavailable = options.isDateUnavailable?.(date) === true;

    for (const plugin of v.plugins) {
      const extra = plugin.decorateDay?.(date, v.context);
      if (extra) Object.assign(meta, extra);
      if (plugin.isDateUnavailable?.(date, v.context) === true) isUnavailable = true;
    }

    const inRangeMode = v.mode === 'range' && v.rangeFrom !== null && v.rangeTo !== null;
    const isSelected = v.selectedSet
      ? v.selectedSet.has(epochDay)
      : v.selectedFrom !== null &&
        v.selectedTo !== null &&
        epochDay >= v.selectedFrom &&
        epochDay <= v.selectedTo;

    return {
      date,
      label: v.numbers.format(date.day),
      isToday: epochDay === v.today,
      isSelected,
      isRangeStart: inRangeMode && epochDay === v.rangeFrom,
      isRangeEnd: inRangeMode && epochDay === v.rangeTo,
      isInRange: inRangeMode && epochDay > (v.rangeFrom ?? 0) && epochDay < (v.rangeTo ?? 0),
      isInPreview: v.previewing && epochDay >= (v.rangeFrom ?? 0) && epochDay <= (v.rangeTo ?? 0),
      isFocused: epochDay === v.focusedEpoch,
      isOutsideMonth: epochDay < month.start || epochDay >= month.start + month.length,
      isDisabled: (v.min !== null && epochDay < v.min) || (v.max !== null && epochDay > v.max),
      isUnavailable,
      meta,
    };
  }

  /** The 6 weeks of one visible month. */
  function buildWeeks(v: View, grid: GridInfo): DayCell[][] {
    const leading = (weekdayOfEpochDay(grid.start) - v.weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const gridStart = grid.start - leading;

    const weeks: DayCell[][] = [];
    for (let week = 0; week < WEEKS_SHOWN; week++) {
      const row: DayCell[] = [];
      for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday++) {
        const epochDay = gridStart + week * DAYS_PER_WEEK + weekday;
        row.push(makeCell(v, v.cal.fromEpochDay(epochDay), epochDay, grid));
      }
      weeks.push(row);
    }
    return weeks;
  }

  function buildState(): CalendarState<SelectionMode> {
    const v = getView();

    const intlLocale = new Intl.Locale(v.locale, {
      calendar: INTL_CALENDARS[v.system] ?? v.system,
    });
    const monthYear = new Intl.DateTimeFormat(intlLocale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const grids: MonthGrid[] = v.grids.map((grid) => {
      const parts = monthYear.formatToParts(utcDate(grid.start));
      const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
      return {
        year: grid.year,
        month: grid.month,
        label: monthYear.format(utcDate(grid.start)),
        monthName: part('month'),
        yearLabel: part('year'),
        weeks: buildWeeks(v, grid),
      };
    });
    const primary = grids[0];
    if (!primary) throw new Error('A calendar shows at least one month');
    const lastGrid = grids[grids.length - 1] ?? primary;

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
        isSelected: touchesSelection(v, range),
        isFocused: focused.month === month,
        isDisabled: isOutOfBounds(v, range),
      });
    }

    const page = yearPageOf(focused.year);
    const years: YearCell[] = page.map((year, index) => ({
      year,
      label: yearNumbers.format(year),
      isCurrent: todayDate.year === year,
      isSelected: touchesSelection(v, yearRange(v, year)),
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
      selection: v.mode,
      value: v.value,
      anchor,
      focusedDate: focused,
      visibleMonth: { year: v.first.year, month: v.first.month },
      weeks: primary.weeks,
      weekdayLabels,
      monthLabel: primary.label,
      visibleMonths: grids.length,
      grids,
      visibleLabel: grids.length === 1 ? primary.label : `${primary.label} – ${lastGrid.label}`,
      view: currentView,
      monthName: monthName(v.first.start),
      yearLabel: yearNumbers.format(v.first.year),
      months,
      years,
      yearsLabel: `${yearNumbers.format(decade)} – ${yearNumbers.format(decade + YEARS_PER_DECADE - 1)}`,
    };
  }

  function getState(): CalendarState<SelectionMode> {
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

  /** Store and report a new value. `focusOn` is the day the user acted on: the view follows it. */
  function commitValue(next: Selection, focusOn: CalendarDate | null): void {
    const previousFocus = focused;
    if (options.value === undefined) internalValue = next;
    if (focusOn) {
      focused = focusOn;
      reveal();
    }
    emit();
    options.onChange?.(next);
    if (focusOn && !isSameDay(previousFocus, focusOn)) options.onFocusedDateChange?.(focusOn);
  }

  /** Range mode: the first click sets the start, the second completes the range. */
  function selectInRange(v: View, target: CalendarDate): void {
    if (anchor === null) {
      anchor = target;
      previewEpoch = null;
      setFocused(target);
      return;
    }

    const start = v.cal.toEpochDay(anchor);
    const other = v.cal.toEpochDay(target);
    const from = Math.min(start, other);
    const to = Math.max(start, other);

    if (options.allowUnavailableInRange === false) {
      for (let epochDay = from; epochDay <= to; epochDay++) {
        if (makeCell(v, v.cal.fromEpochDay(epochDay), epochDay).isUnavailable) return;
      }
    }

    const range: DateRange =
      start <= other ? { start: anchor, end: target } : { start: target, end: anchor };
    anchor = null;
    previewEpoch = null;
    commitValue(range, target);
  }

  /** Multiple mode: a day that is selected becomes unselected and the other way round. */
  function toggleInList(v: View, target: CalendarDate): void {
    const current = Array.isArray(v.value) ? v.value : [];
    const epochDay = v.cal.toEpochDay(target);
    const selected = current.some((date) => v.cal.toEpochDay(date) === epochDay);

    if (selected) {
      commitValue(
        current.filter((date) => v.cal.toEpochDay(date) !== epochDay),
        target,
      );
      return;
    }
    if (options.maxSelected !== undefined && current.length >= options.maxSelected) return;
    commitValue([...current, target].sort(compareDates), target);
  }

  function select(date: CalendarDate): void {
    const v = getView();
    const target = convertDate(date, v.system);
    const cell = makeCell(v, target, v.cal.toEpochDay(target));
    if (cell.isDisabled || cell.isUnavailable) return;

    if (v.mode === 'range') selectInRange(v, target);
    else if (v.mode === 'multiple') toggleInList(v, target);
    else commitValue(target, target);
  }

  function clear(): void {
    const hadAnchor = anchor !== null;
    anchor = null;
    previewEpoch = null;
    if (isEmptySelection(getRawValue())) {
      if (hadAnchor) emit();
      return;
    }
    commitValue(emptyValue(getMode()), null);
  }

  function previewTo(date: CalendarDate | null): void {
    if (getMode() !== 'range' || anchor === null) return;
    const next = date ? getCalendar(getSystem()).toEpochDay(convertDate(date, getSystem())) : null;
    if (next === previewEpoch) return;
    previewEpoch = next;
    emit();
  }

  // --- Months and years ---

  function setView(next: CalendarView): void {
    if (currentView === next) return;
    // The months and years views work on the first visible month: the focus moves into it.
    if (next !== 'days' && monthKey(focused) !== monthKey(shown)) {
      focused = withMonth(focused, shown.year, shown.month);
    }
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
    showFocused(withMonth(focused, focused.year, month));
  }

  function chooseYear(year: number): void {
    const v = getView();
    if (isOutOfBounds(v, yearRange(v, year))) return;
    currentView = 'days';
    showFocused(withMonth(focused, year, Math.min(focused.month, v.cal.monthsInYear(year))));
  }

  /** The previous and next buttons move by a month, a year or ten years, depending on the view. */
  function stepBy(direction: 1 | -1): void {
    if (currentView === 'days') shift(direction);
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
    // A range in the making follows the keyboard, like it follows the pointer.
    if (currentView === 'days' && getMode() === 'range' && anchor !== null) {
      previewEpoch = getCalendar(getSystem()).toEpochDay(date);
    }
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
        if (event.shiftKey) return moveFocus(event, addYears(focused, 1));
        event.preventDefault();
        shift(1, true);
        return true;
      case 'PageUp':
        if (event.shiftKey) return moveFocus(event, addYears(focused, -1));
        event.preventDefault();
        shift(-1, true);
        return true;
      case 'Enter':
      case ' ':
        event.preventDefault();
        select(focused);
        return true;
      case 'Escape':
        // A range that is waiting for its end is cancelled. Otherwise the key is not ours.
        if (anchor === null) return false;
        event.preventDefault();
        anchor = null;
        previewEpoch = null;
        emit();
        return true;
      default:
        return false;
    }
  }

  const calendar: Calendar<SelectionMode> = {
    getState,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setOptions(next) {
      const keys = Object.keys(next) as (keyof CalendarOptions<SelectionMode>)[];
      // Adapters call this on every render, so doing nothing for unchanged options matters.
      if (keys.every((key) => Object.is(options[key], next[key]))) return;

      const previousSystem = getSystem();
      const previousMode = getMode();
      const previousKey = selectionKey(getRawValue());
      options = { ...options, ...next };
      registerPlugins(next.plugins);

      const system = getSystem();
      const mode = getMode();
      if (mode !== previousMode) {
        // A range or a list means nothing in another mode.
        anchor = null;
        previewEpoch = null;
        if (options.value === undefined) internalValue = emptyValue(mode);
      }

      const rawValue = getRawValue();
      const target = firstDateOf(normalizeSelection(mode, rawValue, system));
      // Show the new value. An unchanged value must not pull the user back from other months.
      const valueChanged = target !== null && selectionKey(rawValue) !== previousKey;

      if (next.focusedDate) {
        showFocused(convertDate(next.focusedDate, system));
        return;
      }
      if (valueChanged) {
        showFocused(target);
        return;
      }
      if (system !== previousSystem) {
        focused = convertDate(focused, system);
        shown = firstOfMonth(focused);
        if (anchor) anchor = convertDate(anchor, system);
      } else if (next.visibleMonths !== undefined) {
        // More or fewer months: the focused day has to stay visible.
        reveal();
      }
      emit();
    },

    nextMonth: () => shift(1),
    prevMonth: () => shift(-1),
    nextYear: () => setFocused(addYears(focused, 1)),
    prevYear: () => setFocused(addYears(focused, -1)),
    goTo: (date) => showFocused(convertDate(date, getSystem())),
    goToToday: () => showFocused(getCalendar(getSystem()).fromEpochDay(getToday())),

    select,
    clear,
    previewTo,
    handleKeyDown,

    setView,
    chooseMonth,
    chooseYear,

    getRootProps() {
      const v = getView();
      return {
        attrs: { role: 'group', 'aria-label': getState().visibleLabel, dir: v.direction },
        handlers: {},
      };
    },

    getGridProps(index = 0) {
      const state = getState();
      const label =
        currentView === 'days'
          ? (state.grids[index]?.label ?? state.monthLabel)
          : currentView === 'months'
            ? state.yearLabel
            : state.yearsLabel;
      return {
        attrs: {
          role: 'grid',
          'aria-label': label,
          'aria-multiselectable':
            currentView === 'days' && getMode() !== 'single' ? true : undefined,
        },
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
          'data-range-start': cell.isRangeStart || undefined,
          'data-range-end': cell.isRangeEnd || undefined,
          'data-in-range': cell.isInRange || undefined,
          'data-in-preview': cell.isInPreview || undefined,
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

  return calendar as unknown as Calendar<M>;
}
