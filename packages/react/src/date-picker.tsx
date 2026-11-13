import {
  convertDate,
  formatDate,
  formatDateRange,
  formatSelection,
  isEmptySelection,
  parseDate,
  parseDateRange,
  pickerLabelsFor,
  registerCalendar,
  toSystem,
  type CalendarDate,
  type CalendarOptions,
  type CalendarSystem,
  type PickerLabels,
  type Selection,
  type SelectionMode,
  type SelectionValue,
} from '@calendrix/core';
import { useEffect, useRef, useState } from 'react';
import { Calendar } from './calendar';
import { usePickerPopover } from './use-picker-popover';

export type DatePickerLabels = Partial<PickerLabels> & {
  /** The text of a long list of days in `multiple` mode. Default: "5 dates" (built in for en, fa, de). */
  datesSelected?: (count: number) => string;
};

export interface DatePickerProps<M extends SelectionMode = 'single'> {
  /** One day (default), a range with a start and an end, or any number of separate days. */
  selection?: M;
  /** The selection. Passing it (even `null`) makes the picker controlled. The type follows `selection`. */
  value?: SelectionValue<M>;
  defaultValue?: SelectionValue<M>;
  onChange?: (value: SelectionValue<M>) => void;

  /** Calendar system shown and understood when typing. Default: 'gregory'. */
  system?: CalendarSystem;
  /** BCP 47 locale for names, numerals and the order of a typed date. Default: 'en-US'. */
  locale?: string;
  /** Plugins register calendar systems, for example `persianPlugin`. */
  plugins?: CalendarOptions['plugins'];

  minDate?: CalendarDate;
  maxDate?: CalendarDate;
  isDateUnavailable?: (date: CalendarDate) => boolean;
  /** First day of the week, 0 is Sunday. Default: from the locale. */
  weekStart?: CalendarOptions['weekStart'];
  /** Default: from the locale. */
  direction?: CalendarOptions['direction'];
  timeZone?: string;
  now?: () => Date;

  /** How many months the calendar shows. Default: 2 for `range`, 1 otherwise. */
  visibleMonths?: number;
  /** Range: allow a range that contains unavailable days. Default: true. */
  allowUnavailableInRange?: boolean;
  /** Multiple: the most days that can be selected. Default: no limit. */
  maxSelected?: number;
  /**
   * Close the popover when the selection is complete: a picked day, or the second day of a range.
   * Default: true, except for `multiple`.
   */
  closeOnSelect?: boolean;

  labels?: DatePickerLabels;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Render the popover in `document.body` (default). Pass `false` to render it next to the input. */
  portal?: boolean;
}

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
 * A text input and a popover with a calendar, for one day, a range or many days (no time: see
 * `DateTimePicker`). A day or a range can be typed or picked; a list of days is picked, and the
 * input shows it as text. It has no styles of its own, see `@calendrix/react/styles.css`.
 */
export function DatePicker<M extends SelectionMode = 'single'>({
  selection = 'single' as M,
  value: controlledValue,
  defaultValue,
  onChange,
  system = 'gregory',
  locale = 'en-US',
  plugins,
  minDate,
  maxDate,
  isDateUnavailable,
  weekStart,
  direction,
  timeZone,
  now,
  visibleMonths,
  allowUnavailableInRange,
  maxSelected,
  closeOnSelect,
  labels,
  placeholder,
  disabled,
  id,
  className,
  portal = true,
}: DatePickerProps<M>) {
  // Typing a date in a calendar from a plugin works before the popover has ever been opened.
  for (const plugin of plugins ?? []) {
    for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
  }

  const empty = (selection === 'multiple' ? [] : null) as SelectionValue<M>;
  const [internalValue, setInternalValue] = useState<SelectionValue<M>>(defaultValue ?? empty);
  const isControlled = controlledValue !== undefined;
  const value = (isControlled ? controlledValue : internalValue) as SelectionValue<M>;
  /** The selection in the calendar system on screen. */
  const shown = toSystem(value as Selection, system);

  const [touched, setTouched] = useState(false);

  const { open, setOpen, close, inputRef, setWrapper, dialogId, popoverProps, renderLayer } =
    usePickerPopover({ portal });
  const text_ = pickerLabelsFor(locale, labels, 'date');

  const format = (next: Selection) => formatSelection(next, locale, labels?.datesSelected);
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

  const commit = (next: Selection) => {
    if (!isControlled) setInternalValue(next as SelectionValue<M>);
    onChange?.(next as SelectionValue<M>);
  };

  /** A typed text: one date, or a range. A list of days is not typed. */
  const parse = (next: string): Selection =>
    selection === 'range'
      ? parseDateRange(next, { locale, system })
      : parseDate(next, { locale, system });

  const handleText = (next: string) => {
    setText(next);
    if (next.trim() === '') {
      if (!isEmptySelection(value as Selection)) {
        typing.current = true;
        commit(empty as Selection);
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
    if (selection !== 'multiple' && text.trim() !== '' && parse(text)) setText(valueKey);
  };

  const invalid =
    selection !== 'multiple' && touched && text.trim() !== '' && parse(text) === null;

  const handleCalendarChange = (next: SelectionValue<M>) => {
    commit(next as Selection);
    const closes = closeOnSelect ?? selection !== 'multiple';
    if (closes && !isEmptySelection(next as Selection)) close(true);
  };

  const sample = convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, system);
  const sampleEnd = convertDate({ system: 'gregory', year: 2026, month: 10, day: 21 }, system);
  const samplePlaceholder =
    selection === 'range'
      ? formatDateRange({ start: sample, end: sampleEnd }, locale)
      : selection === 'multiple'
        ? ''
        : formatDate(sample, locale);

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
          readOnly={selection === 'multiple'}
          placeholder={placeholder ?? samplePlaceholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => handleText(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            } else if (
              selection === 'multiple' &&
              (event.key === 'Delete' || event.key === 'Backspace')
            ) {
              event.preventDefault();
              commit(empty as Selection);
            }
          }}
        />
        {!disabled && !isEmptySelection(value as Selection) && (
          <button
            type="button"
            className="calendrix-toggle calendrix-clear"
            aria-label={text_.clear}
            onClick={() => {
              commit(empty as Selection);
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
            <Calendar<M>
              selection={selection}
              system={system}
              locale={locale}
              plugins={plugins}
              value={shown as SelectionValue<M>}
              onChange={handleCalendarChange}
              minDate={minDate}
              maxDate={maxDate}
              isDateUnavailable={isDateUnavailable}
              weekStart={weekStart}
              direction={direction}
              timeZone={timeZone}
              now={now}
              visibleMonths={visibleMonths ?? (selection === 'range' ? 2 : 1)}
              allowUnavailableInRange={allowUnavailableInRange}
              maxSelected={maxSelected}
            />
            <div className="calendrix-popover-footer" data-actions-only="">
              <div className="calendrix-actions">
                <button
                  type="button"
                  className="calendrix-action"
                  onClick={() => commit(empty as Selection)}
                >
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
