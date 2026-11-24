import {
  convertDate,
  formatDateTime,
  formatDateTimeRange,
  isDateSelectable,
  isRangeSelectable,
  isTimeSelectable,
  parseDateTime,
  parseDateTimeRange,
  pickerLabelsFor,
  registerCalendar,
  stickEndToStart,
  type CalendarDate,
  type CalendarOptions,
  type CalendarSystem,
  type DateRange,
  type DateTimeMode,
  type DateTimePickerValue,
  type DateTimeRange,
  type DateTimeValue,
  type HourCycle,
  type PickerLabels,
  type TimeValue,
} from '@calendrix/core';
import { useEffect, useRef, useState } from 'react';
import { Calendar } from './calendar';
import { TimeField } from './time-field';
import { usePickerPopover } from './use-picker-popover';

export interface DateTimePickerProps<M extends DateTimeMode = 'single'> {
  /** One date and time (default), or a range with a start and an end, each with a time. */
  selection?: M;
  /** The picked date and time. Passing it (even `null`) makes the picker controlled. The type follows `selection`. */
  value?: DateTimePickerValue<M>;
  defaultValue?: DateTimePickerValue<M>;
  /** In `range` mode it is called when the range is complete, or when a time of a complete range changes. */
  onChange?: (value: DateTimePickerValue<M>) => void;

  /** Calendar system shown and understood when typing. Default: 'gregory'. */
  system?: CalendarSystem;
  /** BCP 47 locale for names, numerals and the order of a typed date. Default: 'en-US'. */
  locale?: string;
  /** 12 or 24. Default: the locale's own habit. */
  hourCycle?: HourCycle;
  showSeconds?: boolean;
  /** Step of the up and down arrows in the time field. Default: 1. */
  hourStep?: number;
  minuteStep?: number;
  secondStep?: number;
  /** Times outside this range are rejected. A picked date starts at `minTime`. */
  minTime?: TimeValue;
  maxTime?: TimeValue;

  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  /** First day of the week, 0 is Sunday. Default: from the locale. */
  weekStart?: CalendarOptions['weekStart'];
  /** Default: from the locale. */
  direction?: CalendarOptions['direction'];
  /** How many months the calendar shows: 1 (default; 2 for `range`), 2 or 3. */
  visibleMonths?: number;
  isDateUnavailable?: (date: CalendarDate) => boolean;
  /** Plugins register calendar systems, for example `persianPlugin`. */
  plugins?: CalendarOptions['plugins'];
  timeZone?: string;
  now?: () => Date;

  labels?: Partial<PickerLabels>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;

  /**
   * Render the popover in `document.body` (default). Pass `false` to render it next to the
   * input instead. The `data-theme` of the nearest ancestor is copied to a portaled popover (ADR 0026).
   */
  portal?: boolean;
}

const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

/** The two shapes the picker works with inside; the public type follows `selection`. */
type Value = DateTimeValue | DateTimeRange | null;

const isRange = (value: Value): value is DateTimeRange => value !== null && 'start' in value;

function CalendarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18">
      <rect
        x="2.5"
        y="3.5"
        width="13"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M2.5 7.5h13M6 2v3M12 2v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * A text input and a popover with a calendar and a time field. The user can type a date and a
 * time or pick them; the value is the same `{ date, time }` the core uses (no time zone: see
 * `toInstant`). With `selection="range"` the value is `{ start, end }`, each with a date and a
 * time, and the popover has two time fields (ADR 0023). It has no styles of its own, see
 * `@calendrix/react/styles.css`.
 */
export function DateTimePicker<M extends DateTimeMode = 'single'>({
  selection = 'single' as M,
  value: controlledValue,
  defaultValue,
  onChange,
  system = 'gregory',
  locale = 'en-US',
  hourCycle,
  showSeconds,
  hourStep,
  minuteStep,
  secondStep,
  minTime,
  maxTime,
  plugins,
  visibleMonths,
  labels,
  placeholder,
  disabled,
  id,
  className,
  portal = true,
  ...calendarOptions
}: DateTimePickerProps<M>) {
  // Typing a date in a calendar from a plugin works before the popover has ever been opened.
  for (const plugin of plugins ?? []) {
    for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
  }

  const isRangeMode = selection === 'range';
  const [internalValue, setInternalValue] = useState<Value>((defaultValue ?? null) as Value);
  const isControlled = controlledValue !== undefined;
  const value = (isControlled ? controlledValue : internalValue) as Value;
  /**
   * A time chosen before any date. It becomes part of the value when a date is picked. In
   * `single` mode `draftStart` is the only one; in `range` mode there is one for each end.
   */
  const [draftStart, setDraftStart] = useState<TimeValue | null>(null);
  const [draftEnd, setDraftEnd] = useState<TimeValue | null>(null);

  const [touched, setTouched] = useState(false);

  const { open, setOpen, close, inputRef, setWrapper, dialogId, popoverProps, renderLayer } =
    usePickerPopover({ portal });
  const text_ = pickerLabelsFor(locale, labels);

  const textOptions = { locale, hourCycle, seconds: showSeconds };
  const format = (next: Value): string => {
    if (next === null) return '';
    return isRange(next)
      ? formatDateTimeRange(next, textOptions)
      : formatDateTime(next, textOptions);
  };
  const parseText = (next: string): Value =>
    isRangeMode
      ? parseDateTimeRange(next, { locale, system })
      : parseDateTime(next, { locale, system });

  /** A date or a time that the user could not pick is not a value either (ADR 0025). */
  const parse = (next: string): Value => {
    const parsed = parseText(next);
    if (parsed === null) return null;
    const limits = {
      minDate: calendarOptions.minDate,
      maxDate: calendarOptions.maxDate,
      isDateUnavailable: calendarOptions.isDateUnavailable,
      plugins,
      locale,
      system,
      minTime,
      maxTime,
    };
    if (isRange(parsed)) {
      const dates = { start: parsed.start.date, end: parsed.end.date };
      return isRangeSelectable(dates, limits) &&
        isTimeSelectable(parsed.start.time, limits) &&
        isTimeSelectable(parsed.end.time, limits)
        ? parsed
        : null;
    }
    return isDateSelectable(parsed.date, limits) && isTimeSelectable(parsed.time, limits)
      ? parsed
      : null;
  };

  // The value in the calendar system on screen.
  const inSystem = (point: DateTimeValue): DateTimeValue => ({
    date: convertDate(point.date, system),
    time: point.time,
  });
  const shown: Value =
    value === null
      ? null
      : isRange(value)
        ? { start: inSystem(value.start), end: inSystem(value.end) }
        : inSystem(value);
  const shownPoint = shown !== null && !isRange(shown) ? shown : null;
  const shownRange = shown !== null && isRange(shown) ? shown : null;
  const valueKey = format(shown);

  const [text, setText] = useState(valueKey);
  /** True while the value is changing because the user typed it: the text must stay as typed. */
  const typing = useRef(false);

  useEffect(() => {
    if (typing.current) {
      typing.current = false;
      return;
    }
    setText(valueKey);
  }, [valueKey]);

  // The flag only covers the render caused by typing. A later change from the parent updates the text.
  useEffect(() => {
    typing.current = false;
  });

  const commit = (next: Value) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next as DateTimePickerValue<M>);
  };

  const handleText = (next: string) => {
    setText(next);
    if (next.trim() === '') {
      if (value !== null) {
        typing.current = true;
        commit(null);
      }
      return;
    }
    const parsed = parse(next);
    if (!parsed) return;
    if (format(parsed) !== valueKey) typing.current = true;
    commit(parsed);
  };

  const handleBlur = () => {
    setTouched(true);
    // A valid text is written the standard way once the user is done typing.
    if (text.trim() !== '' && parse(text)) setText(valueKey);
  };

  const invalid = touched && text.trim() !== '' && parse(text) === null;

  const defaultTime = minTime ?? MIDNIGHT;

  const pickDate = (date: CalendarDate | null) => {
    if (!date) return commit(null);
    commit({ date, time: shownPoint?.time ?? draftStart ?? defaultTime });
  };

  /** The second day of a range: the times are the ones already chosen, or the default. */
  const pickRange = (range: DateRange | null) => {
    if (!range) return commit(null);
    commit(
      stickEndToStart({
        start: { date: range.start, time: shownRange?.start.time ?? draftStart ?? defaultTime },
        end: { date: range.end, time: shownRange?.end.time ?? draftEnd ?? defaultTime },
      }),
    );
  };

  const pickTime = (which: 'start' | 'end', time: TimeValue | null) => {
    // Clearing the time of a picked date puts it back to the start of the day.
    const next = time ?? defaultTime;
    if (shownRange) {
      commit(
        stickEndToStart({
          start: which === 'start' ? { ...shownRange.start, time: next } : shownRange.start,
          end: which === 'end' ? { ...shownRange.end, time: next } : shownRange.end,
        }),
      );
    } else if (shownPoint) {
      commit({ date: shownPoint.date, time: next });
    } else if (which === 'start') {
      setDraftStart(time);
    } else {
      setDraftEnd(time);
    }
  };

  const clear = () => {
    setDraftStart(null);
    setDraftEnd(null);
    commit(null);
    setText('');
  };

  const sampleStart: DateTimeValue = {
    date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, system),
    time: { hour: 9, minute: 30, second: 0 },
  };
  const sampleEnd: DateTimeValue = {
    date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 21 }, system),
    time: { hour: 17, minute: 0, second: 0 },
  };
  const samplePlaceholder = isRangeMode
    ? format({ start: sampleStart, end: sampleEnd })
    : format(sampleStart);

  const timeProps = {
    locale,
    hourCycle,
    showSeconds,
    hourStep,
    minuteStep,
    secondStep,
    minTime,
    maxTime,
  };

  return (
    <div ref={setWrapper} className={['calendrix-picker', className].filter(Boolean).join(' ')}>
      <div className="calendrix-picker-field">
        <input
          ref={inputRef}
          id={id}
          className="calendrix-input"
          type="text"
          dir="ltr"
          autoComplete="off"
          value={text}
          placeholder={placeholder ?? samplePlaceholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => handleText(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            }
          }}
        />
        {!disabled && (value !== null || text.trim() !== '') && (
          <button
            type="button"
            className="calendrix-toggle calendrix-clear"
            aria-label={text_.clear}
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
          >
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M3 3l8 8M11 3l-8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="calendrix-toggle"
          aria-label={text_.openCalendar}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarIcon />
        </button>
      </div>

      {open &&
        renderLayer(
          <div {...popoverProps} aria-label={text_.dialog}>
            {isRangeMode ? (
              <Calendar<'range'>
                selection="range"
                system={system}
                locale={locale}
                plugins={plugins}
                value={
                  shownRange ? { start: shownRange.start.date, end: shownRange.end.date } : null
                }
                onChange={pickRange}
                visibleMonths={visibleMonths ?? 2}
                {...calendarOptions}
              />
            ) : (
              <Calendar
                system={system}
                locale={locale}
                plugins={plugins}
                value={shownPoint?.date ?? null}
                onChange={pickDate}
                visibleMonths={visibleMonths}
                {...calendarOptions}
              />
            )}
            <div className="calendrix-popover-footer">
              {isRangeMode ? (
                <div className="calendrix-time-range">
                  <div className="calendrix-time-row">
                    <span className="calendrix-time-label" aria-hidden="true">
                      {text_.startTime}
                    </span>
                    <TimeField
                      {...timeProps}
                      labels={{ time: text_.startTime }}
                      value={shownRange ? shownRange.start.time : draftStart}
                      onChange={(time) => pickTime('start', time)}
                    />
                  </div>
                  <div className="calendrix-time-row">
                    <span className="calendrix-time-label" aria-hidden="true">
                      {text_.endTime}
                    </span>
                    <TimeField
                      {...timeProps}
                      labels={{ time: text_.endTime }}
                      value={shownRange ? shownRange.end.time : draftEnd}
                      onChange={(time) => pickTime('end', time)}
                    />
                  </div>
                </div>
              ) : (
                <TimeField
                  {...timeProps}
                  value={shownPoint ? shownPoint.time : draftStart}
                  onChange={(time) => pickTime('start', time)}
                />
              )}
              <div className="calendrix-actions">
                <button type="button" className="calendrix-action" onClick={clear}>
                  {text_.clear}
                </button>
                <button
                  type="button"
                  className="calendrix-action calendrix-action-primary"
                  onClick={() => close(true)}
                >
                  {text_.done}
                </button>
              </div>
            </div>
          </div>,
        )}
    </div>
  );
}
