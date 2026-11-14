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
  parseDateTime,
  pickerLabelsFor,
  registerCalendar,
  type CalendarDate,
  type CalendarOptions,
  type CalendarSystem,
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

let nextDialogId = 0;

/**
 * A text input and a popover with a calendar and a time field. The user can type a date and a
 * time or pick them; the value is the same `{ date, time }` the core uses (no time zone: see
 * `toInstant`). It has no styles of its own, see the `calendrix-*` classes.
 *
 * Use `[(value)]`, or `[defaultValue]` and `(valueChange)`.
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
        @if (!disabled() && hasValue()) {
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
          <calendrix-calendar
            [system]="system()"
            [locale]="locale()"
            [plugins]="plugins()"
            [value]="shown()?.date ?? null"
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
          <div class="calendrix-popover-footer">
            <calendrix-time-field
              [locale]="locale()"
              [hourCycle]="hourCycle()"
              [showSeconds]="showSeconds()"
              [hourStep]="hourStep()"
              [minuteStep]="minuteStep()"
              [secondStep]="secondStep()"
              [minTime]="minTime()"
              [maxTime]="maxTime()"
              [value]="shown() ? shown()!.time : draftTime()"
              (valueChange)="pickTime($event)"
            />
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
export class CalendrixDateTimePicker implements OnInit, ControlValueAccessor {
  /** The picked date and time. Use `[(value)]`. `null` means nothing is picked. */
  readonly value = model<DateTimeValue | null>();
  readonly defaultValue = input<DateTimeValue | null>();

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
  /** How many months the calendar shows: 1 (default), 2 or 3. */
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
  /** A time chosen before any date. It becomes part of the value when a date is picked. */
  protected readonly draftTime = signal<TimeValue | null>(null);
  private readonly touched = signal(false);
  protected readonly dialogId = `calendrix-dialog-${nextDialogId++}`;

  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly injector = inject(Injector);
  /** True while the value is changing because the user typed it: the text must stay as typed. */
  private typing = false;

  /** The value as the parent gave it, or the default until a first change. */
  private readonly current = computed<DateTimeValue | null>(() => {
    const value = this.value();
    return value !== undefined ? value : (this.defaultValue() ?? null);
  });

  /** The value in the calendar system on screen. */
  protected readonly shown = computed<DateTimeValue | null>(() => {
    this.registerPlugins();
    const value = this.current();
    return value ? { date: convertDate(value.date, this.system()), time: value.time } : null;
  });

  private readonly valueKey = computed(() => {
    const shown = this.shown();
    return shown ? this.format(shown) : '';
  });

  protected readonly texts = computed(() => pickerLabelsFor(this.locale(), this.labels()));
  protected readonly hasValue = computed(() => this.current() !== null);

  protected readonly invalid = computed(
    () => this.touched() && this.text().trim() !== '' && this.parse(this.text()) === null,
  );

  protected readonly samplePlaceholder = computed(() => {
    this.registerPlugins();
    return this.format({
      date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, this.system()),
      time: { hour: 9, minute: 30, second: 0 },
    });
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
  private onChangeFn: (value: DateTimeValue | null) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  private readonly formDisabled = signal(false);
  /** Disabled by the `disabled` input or by the form. */
  protected readonly disabled = computed(() => this.disabledInput() || this.formDisabled());

  writeValue(value: unknown): void {
    // null or undefined from a form (a reset, a new control) means empty.
    this.value.set((value ?? null) as DateTimeValue | null);
  }

  registerOnChange(fn: (value: DateTimeValue | null) => void): void {
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

  private format(next: DateTimeValue): string {
    return formatDateTime(next, {
      locale: this.locale(),
      hourCycle: this.hourCycle(),
      seconds: this.showSeconds(),
    });
  }

  private parse(text: string): DateTimeValue | null {
    this.registerPlugins();
    return parseDateTime(text, { locale: this.locale(), system: this.system() });
  }

  private commit(next: DateTimeValue | null): void {
    this.value.set(next);
    this.onChangeFn(next);
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

  protected pickDate(date: CalendarDate | null | undefined): void {
    if (date === undefined) return;
    if (date === null) {
      this.commit(null);
      return;
    }
    const time = this.shown()?.time ?? this.draftTime() ?? this.minTime() ?? MIDNIGHT;
    this.commit({ date, time });
  }

  protected pickTime(time: TimeValue | null | undefined): void {
    if (time === undefined) return;
    const shown = this.shown();
    if (shown) {
      // Clearing the time of a picked date puts it back to the start of the day.
      this.commit({ date: shown.date, time: time ?? this.minTime() ?? MIDNIGHT });
    } else {
      this.draftTime.set(time);
    }
  }

  protected clear(): void {
    this.draftTime.set(null);
    this.commit(null);
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
