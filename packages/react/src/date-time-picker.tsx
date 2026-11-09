import {
  convertDate,
  formatDateTime,
  parseDateTime,
  registerCalendar,
  type CalendarDate,
  type CalendarOptions,
  type CalendarSystem,
  type DateTimeValue,
  type HourCycle,
  type TimeValue,
} from '@calendrix/core';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from './calendar';
import { pickerLabelsFor, type PickerLabels } from './messages';
import { TimeField } from './time-field';
import { usePopoverPosition } from './use-popover-position';

export interface DateTimePickerProps {
  /** The picked date and time. Passing it (even `null`) makes the picker controlled. */
  value?: DateTimeValue | null;
  defaultValue?: DateTimeValue | null;
  onChange?: (value: DateTimeValue | null) => void;

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
  /** How many months the calendar shows: 1 (default), 2 or 3. */
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
   * input instead. The `data-theme` of an ancestor does not reach a portaled popover.
   */
  portal?: boolean;
}

const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

const TABBABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab and Shift+Tab inside the popover by wrapping around at its ends. */
function trapTab(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  const items = Array.from(dialog.querySelectorAll<HTMLElement>(TABBABLE));
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
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
 * A text input and a popover with a calendar and a time field. The user can type a date and a
 * time or pick them; the value is the same `{ date, time }` the core uses (no time zone: see
 * `toInstant`). It has no styles of its own, see `@calendrix/react/styles.css`.
 */
export function DateTimePicker({
  value: controlledValue,
  defaultValue = null,
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
  labels,
  placeholder,
  disabled,
  id,
  className,
  portal = true,
  ...calendarOptions
}: DateTimePickerProps) {
  // Typing a date in a calendar from a plugin works before the popover has ever been opened.
  for (const plugin of plugins ?? []) {
    for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
  }

  const [internalValue, setInternalValue] = useState<DateTimeValue | null>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  /** A time chosen before any date. It becomes part of the value when a date is picked. */
  const [draftTime, setDraftTime] = useState<TimeValue | null>(null);

  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    setReference,
    setFloating,
    style: popoverStyle,
  } = usePopoverPosition(open, portal ? 'fixed' : 'absolute');
  // Each element is needed twice: by our own checks and by the positioning.
  const setWrapper = useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      setReference(node);
    },
    [setReference],
  );
  const setPopover = useCallback(
    (node: HTMLDivElement | null) => {
      popoverRef.current = node;
      setFloating(node);
    },
    [setFloating],
  );
  const renderLayer = (node: ReactNode) => (portal ? createPortal(node, document.body) : node);
  const dialogId = useId();
  const text_ = pickerLabelsFor(locale, labels);

  const format = (next: DateTimeValue) =>
    formatDateTime(next, { locale, hourCycle, seconds: showSeconds });

  // The value in the calendar system on screen.
  const shown: DateTimeValue | null = value
    ? { date: convertDate(value.date, system), time: value.time }
    : null;
  const valueKey = shown ? format(shown) : '';

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

  const commit = (next: DateTimeValue | null) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
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
    const parsed = parseDateTime(next, { locale, system });
    if (!parsed) return;
    if (format(parsed) !== valueKey) typing.current = true;
    commit(parsed);
  };

  const handleBlur = () => {
    setTouched(true);
    // A valid text is written the standard way once the user is done typing.
    if (text.trim() !== '' && parseDateTime(text, { locale, system })) setText(valueKey);
  };

  const invalid = touched && text.trim() !== '' && parseDateTime(text, { locale, system }) === null;

  const pickDate = (date: CalendarDate | null) => {
    if (!date) return commit(null);
    commit({ date, time: shown?.time ?? draftTime ?? minTime ?? MIDNIGHT });
  };

  const pickTime = (time: TimeValue | null) => {
    if (shown) {
      // Clearing the time of a picked date puts it back to midnight.
      commit({ date: shown.date, time: time ?? minTime ?? MIDNIGHT });
    } else {
      setDraftTime(time);
    }
  };

  const clear = () => {
    setDraftTime(null);
    commit(null);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) inputRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Opening moves the focus into the calendar, on the focused day.
  useEffect(() => {
    if (!open) return;
    popoverRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();
  }, [open]);

  // Escape closes the popover from anywhere, even when a click left the focus on the page.
  // A calendar that used the key to leave its month or year view has already handled it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const samplePlaceholder = format({
    date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, system),
    time: { hour: 9, minute: 30, second: 0 },
  });

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

      {open && renderLayer(
        <div
          ref={setPopover}
          id={dialogId}
          role="dialog"
          aria-label={text_.dialog}
          className="calendrix-popover"
          style={popoverStyle}
          tabIndex={-1}
          onKeyDown={trapTab}
        >
          <Calendar
            system={system}
            locale={locale}
            plugins={plugins}
            value={shown?.date ?? null}
            onChange={pickDate}
            {...calendarOptions}
          />
          <div className="calendrix-popover-footer">
            <TimeField
              locale={locale}
              hourCycle={hourCycle}
              showSeconds={showSeconds}
              hourStep={hourStep}
              minuteStep={minuteStep}
              secondStep={secondStep}
              minTime={minTime}
              maxTime={maxTime}
              value={shown ? shown.time : draftTime}
              onChange={pickTime}
            />
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
        </div>
      )}
    </div>
  );
}
