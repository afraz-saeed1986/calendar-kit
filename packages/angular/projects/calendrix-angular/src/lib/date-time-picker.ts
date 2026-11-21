import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  forwardRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
  type OnInit,
} from '@angular/core';
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
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { CalendrixCalendar } from './calendar';
import { CalendrixPopover, type PopoverDismissReason } from './popover';
import { CalendrixTimeField } from './time-field';

const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

/** The two shapes the picker works with inside; the public type follows `selection`. */
type Value = DateTimeValue | DateTimeRange | null;
const isRange = (value: Value): value is DateTimeRange => value !== null && 'start' in value;

let nextDialogId = 0;

/**
 * A text input and a popover with a calendar and a time field. The user can type a date and a
 * time or pick them; the value is the same `{ date, time }` the core uses (no time zone: see
 * `toInstant`). With `selection="range"` the value is `{ start, end }`, each with a date and a
 * time, and the popover has two time fields (ADR 0023). It has no styles of its own, see the
 * `calendrix-*` classes.
 *
 * Use `[(value)]`, or `[defaultValue]` and `(valueChange)`. The type of the value follows
 * `selection`.
 */
@Component({
  selector: 'calendrix-date-time-picker',
  imports: [CalendrixCalendar, CalendrixTimeField, CalendrixPopover],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CalendrixDateTimePicker),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="calendrix-picker" #wrapper>
      <div class="calendrix-picker-field">
        <input
          #input
          class="calendrix-input"
          type="text"
          dir="ltr"
          autocomplete="off"
          [attr.id]="inputId()"
          [value]="text()"
          [placeholder]="placeholder() ?? samplePlaceholder()"
          [disabled]="disabled()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          (input)="onInput($event)"
          (blur)="handleBlur()"
          (keydown)="onInputKeydown($event)"
        />
        @if (!disabled() && (hasValue() || text().trim() !== '')) {
          <button
            type="button"
            class="calendrix-toggle calendrix-clear"
            [attr.aria-label]="texts().clear"
            (click)="clearAndFocus()"
          >
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
              <path
                d="M3 3l8 8M11 3l-8 8"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        }
        <button
          type="button"
          class="calendrix-toggle"
          aria-haspopup="dialog"
          [attr.aria-label]="texts().openCalendar"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="open() ? dialogId : null"
          [disabled]="disabled()"
          (click)="open.set(!open())"
        >
          <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18">
            <rect
              x="2.5"
              y="3.5"
              width="13"
              height="12"
              rx="2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M2.5 7.5h13M6 2v3M12 2v3"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      @if (open()) {
        <div
          role="dialog"
          [id]="dialogId"
          [attr.aria-label]="texts().dialog"
          [calendrixPopover]="wrapper"
          [portal]="portal()"
          (dismiss)="onDismiss($event)"
        >
          @if (isRangeMode()) {
            <calendrix-calendar
              [selection]="'range'"
              [system]="system()"
              [locale]="locale()"
              [plugins]="plugins()"
              [value]="calendarRange()"
              (valueChange)="pickRange($event)"
              [minDate]="minDate()"
              [maxDate]="maxDate()"
              [isDateUnavailable]="isDateUnavailable()"
              [weekStart]="weekStart()"
              [direction]="direction()"
              [visibleMonths]="visibleMonths() ?? 2"
              [timeZone]="timeZone()"
              [now]="now()"
            />
          } @else {
            <calendrix-calendar
              [system]="system()"
              [locale]="locale()"
              [plugins]="plugins()"
              [value]="shownPoint()?.date ?? null"
              (valueChange)="pickDate($event)"
              [minDate]="minDate()"
              [maxDate]="maxDate()"
              [isDateUnavailable]="isDateUnavailable()"
              [weekStart]="weekStart()"
              [direction]="direction()"
              [visibleMonths]="visibleMonths()"
              [timeZone]="timeZone()"
              [now]="now()"
            />
          }
          <div class="calendrix-popover-footer">
            @if (isRangeMode()) {
              <div class="calendrix-time-range">
                <div class="calendrix-time-row">
                  <span class="calendrix-time-label" aria-hidden="true">{{
                    texts().startTime
                  }}</span>
                  <calendrix-time-field
                    [locale]="locale()"
                    [hourCycle]="hourCycle()"
                    [showSeconds]="showSeconds()"
                    [hourStep]="hourStep()"
                    [minuteStep]="minuteStep()"
                    [secondStep]="secondStep()"
                    [minTime]="minTime()"
                    [maxTime]="maxTime()"
                    [labels]="startLabels()"
                    [value]="shownRange() ? shownRange()!.start.time : draftStart()"
                    (valueChange)="pickTime('start', $event)"
                  />
                </div>
                <div class="calendrix-time-row">
                  <span class="calendrix-time-label" aria-hidden="true">{{ texts().endTime }}</span>
                  <calendrix-time-field
                    [locale]="locale()"
                    [hourCycle]="hourCycle()"
                    [showSeconds]="showSeconds()"
                    [hourStep]="hourStep()"
                    [minuteStep]="minuteStep()"
                    [secondStep]="secondStep()"
                    [minTime]="minTime()"
                    [maxTime]="maxTime()"
                    [labels]="endLabels()"
                    [value]="shownRange() ? shownRange()!.end.time : draftEnd()"
                    (valueChange)="pickTime('end', $event)"
                  />
                </div>
              </div>
            } @else {
              <calendrix-time-field
                [locale]="locale()"
                [hourCycle]="hourCycle()"
                [showSeconds]="showSeconds()"
                [hourStep]="hourStep()"
                [minuteStep]="minuteStep()"
                [secondStep]="secondStep()"
                [minTime]="minTime()"
                [maxTime]="maxTime()"
                [value]="shownPoint() ? shownPoint()!.time : draftStart()"
                (valueChange)="pickTime('start', $event)"
              />
            }
            <div class="calendrix-actions">
              <button type="button" class="calendrix-action" (click)="clear()">
                {{ texts().clear }}
              </button>
              <button
                type="button"
                class="calendrix-action calendrix-action-primary"
                (click)="close(true)"
              >
                {{ texts().done }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CalendrixDateTimePicker<M extends DateTimeMode = 'single'>
  implements OnInit, ControlValueAccessor
{
  /** One date and time (default), or a range with a start and an end, each with a time. */
  readonly selection = input<M>('single' as M);
  /** The picked value. Use `[(value)]`. The type follows `selection`. `null` means nothing. */
  readonly value = model<DateTimePickerValue<M>>();
  readonly defaultValue = input<DateTimePickerValue<M>>();

  /** Calendar system shown and understood when typing. Default: 'gregory'. */
  readonly system = input<CalendarSystem>('gregory');
  /** BCP 47 locale for names, numerals and the order of a typed date. Default: 'en-US'. */
  readonly locale = input('en-US');
  /** 12 or 24. Default: the locale's own habit. */
  readonly hourCycle = input<HourCycle>();
  readonly showSeconds = input<boolean>();
  /** Step of the up and down arrows in the time field. Default: 1. */
  readonly hourStep = input<number>();
  readonly minuteStep = input<number>();
  readonly secondStep = input<number>();
  /** Times outside this range are rejected. A picked date starts at `minTime`. */
  readonly minTime = input<TimeValue>();
  readonly maxTime = input<TimeValue>();

  readonly minDate = input<CalendarDate>();
  readonly maxDate = input<CalendarDate>();
  /** First day of the week, 0 is Sunday. Default: from the locale. */
  readonly weekStart = input<CalendarOptions['weekStart']>();
  /** Default: from the locale. */
  readonly direction = input<CalendarOptions['direction']>();
  /** How many months the calendar shows: 1 (default; 2 for `range`), 2 or 3. */
  readonly visibleMonths = input<number>();
  readonly isDateUnavailable = input<(date: CalendarDate) => boolean>();
  /** Plugins register calendar systems, for example `persianPlugin`. */
  readonly plugins = input<CalendarOptions['plugins']>();
  readonly timeZone = input<string>();
  readonly now = input<() => Date>();

  readonly labels = input<Partial<PickerLabels>>();
  readonly placeholder = input<string>();
  readonly disabledInput = input(false, { alias: 'disabled', transform: booleanAttribute });
  /** The `id` of the text input, for a `<label for>`. */
  readonly inputId = input<string>();
  /**
   * Render the popover in `<body>` (default). Use `[portal]="false"` to render it next to the
   * input instead. The `data-theme` of an ancestor does not reach a portaled popover.
   */
  readonly portal = input(true, { transform: booleanAttribute });

  protected readonly open = signal(false);
  protected readonly text = signal('');
  /**
   * A time chosen before any date. It becomes part of the value when a date is picked. In
   * `single` mode `draftStart` is the only one; in `range` mode there is one for each end.
   */
  protected readonly draftStart = signal<TimeValue | null>(null);
  protected readonly draftEnd = signal<TimeValue | null>(null);
  private readonly touched = signal(false);
  protected readonly dialogId = `calendrix-dialog-${nextDialogId++}`;

  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly injector = inject(Injector);
  /** True while the value is changing because the user typed it: the text must stay as typed. */
  private typing = false;

  protected readonly isRangeMode = computed(() => this.selection() === 'range');

  /** The value as the parent gave it, or the default until a first change. */
  private readonly current = computed<Value>(() => {
    const value = this.value() as Value | undefined;
    return value !== undefined ? value : ((this.defaultValue() as Value | undefined) ?? null);
  });

  private inSystem(point: DateTimeValue): DateTimeValue {
    return { date: convertDate(point.date, this.system()), time: point.time };
  }

  /** The value in the calendar system on screen. */
  private readonly shown = computed<Value>(() => {
    this.registerPlugins();
    const value = this.current();
    if (value === null) return null;
    return isRange(value)
      ? { start: this.inSystem(value.start), end: this.inSystem(value.end) }
      : this.inSystem(value);
  });
  protected readonly shownPoint = computed<DateTimeValue | null>(() => {
    const shown = this.shown();
    return shown !== null && !isRange(shown) ? shown : null;
  });
  protected readonly shownRange = computed<DateTimeRange | null>(() => {
    const shown = this.shown();
    return shown !== null && isRange(shown) ? shown : null;
  });
  /** The dates of a complete range, for the calendar. */
  protected readonly calendarRange = computed<DateRange | null>(() => {
    const range = this.shownRange();
    return range ? { start: range.start.date, end: range.end.date } : null;
  });

  private readonly valueKey = computed(() => this.format(this.shown()));

  protected readonly texts = computed(() => pickerLabelsFor(this.locale(), this.labels()));
  protected readonly startLabels = computed(() => ({ time: this.texts().startTime }));
  protected readonly endLabels = computed(() => ({ time: this.texts().endTime }));
  protected readonly hasValue = computed(() => this.current() !== null);

  protected readonly invalid = computed(
    () => this.touched() && this.text().trim() !== '' && this.parse(this.text()) === null,
  );

  protected readonly samplePlaceholder = computed(() => {
    this.registerPlugins();
    const start: DateTimeValue = {
      date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, this.system()),
      time: { hour: 9, minute: 30, second: 0 },
    };
    const end: DateTimeValue = {
      date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 21 }, this.system()),
      time: { hour: 17, minute: 0, second: 0 },
    };
    return this.format(this.isRangeMode() ? { start, end } : start);
  });

  constructor() {
    // A change that did not come from typing (the parent, a pick in the calendar, Clear) rewrites the text.
    effect(() => {
      const key = this.valueKey();
      untracked(() => {
        if (this.typing) {
          this.typing = false;
          return;
        }
        this.text.set(key);
      });
    });
  }

  ngOnInit(): void {
    this.text.set(this.valueKey());
  }

  // ControlValueAccessor: a form writes the value in and hears about changes made by the user.
  private onChangeFn: (value: DateTimePickerValue<M>) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  private readonly formDisabled = signal(false);
  /** Disabled by the `disabled` input or by the form. */
  protected readonly disabled = computed(() => this.disabledInput() || this.formDisabled());

  writeValue(value: unknown): void {
    // null or undefined from a form (a reset, a new control) means empty.
    this.value.set((value ?? null) as DateTimePickerValue<M>);
  }

  registerOnChange(fn: (value: DateTimePickerValue<M>) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /** Typing a date in a calendar from a plugin works before the popover has ever been opened. */
  private registerPlugins(): void {
    for (const plugin of this.plugins() ?? []) {
      for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
    }
  }

  private format(next: Value): string {
    if (next === null) return '';
    const options = {
      locale: this.locale(),
      hourCycle: this.hourCycle(),
      seconds: this.showSeconds(),
    };
    return isRange(next) ? formatDateTimeRange(next, options) : formatDateTime(next, options);
  }

  private parse(text: string): Value {
    this.registerPlugins();
    const options = { locale: this.locale(), system: this.system() };
    const parsed = this.isRangeMode()
      ? parseDateTimeRange(text, options)
      : parseDateTime(text, options);
    if (parsed === null) return null;

    // A date or a time that the user could not pick is not a value either (ADR 0025).
    const limits = {
      minDate: this.minDate(),
      maxDate: this.maxDate(),
      isDateUnavailable: this.isDateUnavailable(),
      plugins: this.plugins(),
      locale: options.locale,
      system: options.system,
      minTime: this.minTime(),
      maxTime: this.maxTime(),
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
  }

  private commit(next: Value): void {
    this.value.set(next as DateTimePickerValue<M>);
    this.onChangeFn(next as DateTimePickerValue<M>);
  }

  /** The flag only covers the render caused by typing. A later change from the parent updates the text. */
  private markTyping(): void {
    this.typing = true;
    afterNextRender(
      () => {
        this.typing = false;
      },
      { injector: this.injector },
    );
  }

  protected onInput(event: Event): void {
    this.handleText((event.target as HTMLInputElement).value);
  }

  private handleText(next: string): void {
    this.text.set(next);
    if (next.trim() === '') {
      if (this.current() !== null) {
        this.markTyping();
        this.commit(null);
      }
      return;
    }
    const parsed = this.parse(next);
    if (!parsed) return;
    if (this.format(parsed) !== this.valueKey()) this.markTyping();
    this.commit(parsed);
  }

  protected handleBlur(): void {
    this.touched.set(true);
    if (!this.open()) this.onTouchedFn();
    // A valid text is written the standard way once the user is done typing.
    const text = this.text();
    if (text.trim() !== '' && this.parse(text)) this.text.set(this.valueKey());
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open.set(true);
    }
  }

  private defaultTime(): TimeValue {
    return this.minTime() ?? MIDNIGHT;
  }

  protected pickDate(date: CalendarDate | null | undefined): void {
    if (date === undefined) return;
    if (date === null) {
      this.commit(null);
      return;
    }
    const time = this.shownPoint()?.time ?? this.draftStart() ?? this.defaultTime();
    this.commit({ date, time });
  }

  /** The second day of a range: the times are the ones already chosen, or the default. */
  protected pickRange(range: DateRange | null | undefined): void {
    if (range === undefined) return;
    if (range === null) {
      this.commit(null);
      return;
    }
    const shown = this.shownRange();
    this.commit(
      stickEndToStart({
        start: {
          date: range.start,
          time: shown?.start.time ?? this.draftStart() ?? this.defaultTime(),
        },
        end: {
          date: range.end,
          time: shown?.end.time ?? this.draftEnd() ?? this.defaultTime(),
        },
      }),
    );
  }

  protected pickTime(which: 'start' | 'end', time: TimeValue | null | undefined): void {
    if (time === undefined) return;
    // Clearing the time of a picked date puts it back to the start of the day.
    const next = time ?? this.defaultTime();
    const range = this.shownRange();
    const point = this.shownPoint();
    if (range) {
      this.commit(
        stickEndToStart({
          start: which === 'start' ? { ...range.start, time: next } : range.start,
          end: which === 'end' ? { ...range.end, time: next } : range.end,
        }),
      );
    } else if (point) {
      this.commit({ date: point.date, time: next });
    } else if (which === 'start') {
      this.draftStart.set(time);
    } else {
      this.draftEnd.set(time);
    }
  }

  protected clear(): void {
    this.draftStart.set(null);
    this.draftEnd.set(null);
    this.commit(null);
    this.text.set('');
  }

  protected clearAndFocus(): void {
    this.clear();
    this.inputElement().nativeElement.focus();
  }

  /** Close the popover, and give the focus back to the input when `returnFocus` is true. */
  protected close(returnFocus: boolean): void {
    this.open.set(false);
    this.onTouchedFn();
    if (returnFocus) this.inputElement().nativeElement.focus();
  }

  protected onDismiss(reason: PopoverDismissReason): void {
    if (reason === 'escape') {
      this.close(true);
    } else {
      this.open.set(false);
      this.onTouchedFn();
    }
  }
}