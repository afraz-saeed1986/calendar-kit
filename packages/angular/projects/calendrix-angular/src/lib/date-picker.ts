import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
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
import { CalendrixCalendar } from './calendar';
import { CalendrixPopover, type PopoverDismissReason } from './popover';

export type DatePickerLabels = Partial<PickerLabels> & {
  /** The text of a long list of days in `multiple` mode. Default: "5 dates" (built in for en, fa, de). */
  datesSelected?: (count: number) => string;
};

let nextDialogId = 0;

/**
 * A text input and a popover with a calendar, for one day, a range or many days (no time: see
 * `DateTimePicker`). A day or a range can be typed or picked; a list of days is picked, and the
 * input shows it as text. It has no styles of its own, see the `calendrix-*` classes.
 *
 * Use `[(value)]`, or `[defaultValue]` and `(valueChange)`. The type of the value follows
 * `selection`.
 */
@Component({
  selector: 'calendrix-date-picker',
  imports: [CalendrixCalendar, CalendrixPopover],
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
          [readOnly]="selection() === 'multiple'"
          [placeholder]="placeholder() ?? samplePlaceholder()"
          [disabled]="disabled()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          (input)="onInput($event)"
          (blur)="handleBlur()"
          (keydown)="onInputKeydown($event)"
        />
        @if (!disabled() && !isEmpty()) {
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
            [selection]="selection()"
            [system]="system()"
            [locale]="locale()"
            [plugins]="plugins()"
            [value]="shown()"
            (valueChange)="onCalendarChange($event)"
            [minDate]="minDate()"
            [maxDate]="maxDate()"
            [isDateUnavailable]="isDateUnavailable()"
            [weekStart]="weekStart()"
            [direction]="direction()"
            [timeZone]="timeZone()"
            [now]="now()"
            [visibleMonths]="visibleMonths() ?? (selection() === 'range' ? 2 : 1)"
            [allowUnavailableInRange]="allowUnavailableInRange()"
            [maxSelected]="maxSelected()"
          />
          <div class="calendrix-popover-footer" data-actions-only="">
            <div class="calendrix-actions">
              <button type="button" class="calendrix-action" (click)="resetValue()">
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
export class CalendrixDatePicker<M extends SelectionMode = 'single'> implements OnInit {
  /** One day (default), a range with a start and an end, or any number of separate days. */
  readonly selection = input<M>('single' as M);
  /** The selection. Use `[(value)]`. The type follows `selection`. */
  readonly value = model<SelectionValue<M>>();
  readonly defaultValue = input<SelectionValue<M>>();

  /** Calendar system shown and understood when typing. Default: 'gregory'. */
  readonly system = input<CalendarSystem>('gregory');
  /** BCP 47 locale for names, numerals and the order of a typed date. Default: 'en-US'. */
  readonly locale = input('en-US');
  /** Plugins register calendar systems, for example `persianPlugin`. */
  readonly plugins = input<CalendarOptions['plugins']>();

  readonly minDate = input<CalendarDate>();
  readonly maxDate = input<CalendarDate>();
  readonly isDateUnavailable = input<(date: CalendarDate) => boolean>();
  /** First day of the week, 0 is Sunday. Default: from the locale. */
  readonly weekStart = input<CalendarOptions['weekStart']>();
  /** Default: from the locale. */
  readonly direction = input<CalendarOptions['direction']>();
  readonly timeZone = input<string>();
  readonly now = input<() => Date>();

  /** How many months the calendar shows. Default: 2 for `range`, 1 otherwise. */
  readonly visibleMonths = input<number>();
  /** Range: allow a range that contains unavailable days. Default: true. */
  readonly allowUnavailableInRange = input<boolean>();
  /** Multiple: the most days that can be selected. Default: no limit. */
  readonly maxSelected = input<number>();
  /**
   * Close the popover when the selection is complete: a picked day, or the second day of a range.
   * Default: true, except for `multiple`.
   */
  readonly closeOnSelect = input<boolean>();

  readonly labels = input<DatePickerLabels>();
  readonly placeholder = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The `id` of the text input, for a `<label for>`. */
  readonly inputId = input<string>();
  /** Render the popover in `<body>` (default). Use `[portal]="false"` to render it next to the input. */
  readonly portal = input(true, { transform: booleanAttribute });

  protected readonly open = signal(false);
  protected readonly text = signal('');
  private readonly touched = signal(false);
  protected readonly dialogId = `calendrix-dialog-${nextDialogId++}`;

  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly injector = inject(Injector);
  /** True while the value is changing because the user typed it: the text must stay as typed. */
  private typing = false;

  private readonly empty = computed(
    () => (this.selection() === 'multiple' ? [] : null) as SelectionValue<M>,
  );

  /** The value as the parent gave it, or the default (and the empty value) until a first change. */
  private readonly current = computed(() => {
    const value = this.value();
    return (value !== undefined ? value : (this.defaultValue() ?? this.empty())) as SelectionValue<M>;
  });

  /** The selection in the calendar system on screen. */
  protected readonly shown = computed(() => {
    this.registerPlugins();
    return toSystem(this.current() as Selection, this.system()) as SelectionValue<M>;
  });

  private readonly valueKey = computed(() => this.format(this.shown() as Selection));
  protected readonly isEmpty = computed(() => isEmptySelection(this.current() as Selection));
  protected readonly texts = computed(() => pickerLabelsFor(this.locale(), this.labels(), 'date'));

  protected readonly invalid = computed(
    () =>
      this.selection() !== 'multiple' &&
      this.touched() &&
      this.text().trim() !== '' &&
      this.parse(this.text()) === null,
  );

  protected readonly samplePlaceholder = computed(() => {
    this.registerPlugins();
    const system = this.system();
    const locale = this.locale();
    const sample = convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, system);
    const sampleEnd = convertDate({ system: 'gregory', year: 2026, month: 10, day: 21 }, system);
    switch (this.selection()) {
      case 'range':
        return formatDateRange({ start: sample, end: sampleEnd }, locale);
      case 'multiple':
        return '';
      default:
        return formatDate(sample, locale);
    }
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

  /** Typing a date in a calendar from a plugin works before the popover has ever been opened. */
  private registerPlugins(): void {
    for (const plugin of this.plugins() ?? []) {
      for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
    }
  }

  private format(selection: Selection): string {
    return formatSelection(selection, this.locale(), this.labels()?.datesSelected);
  }

  /** A typed text: one date, or a range. A list of days is not typed. */
  private parse(text: string): Selection {
    this.registerPlugins();
    const options = { locale: this.locale(), system: this.system() };
    return this.selection() === 'range' ? parseDateRange(text, options) : parseDate(text, options);
  }

  private commit(next: Selection): void {
    this.value.set(next as SelectionValue<M>);
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
      if (!this.isEmpty()) {
        this.markTyping();
        this.commit(this.empty() as Selection);
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
    // A valid text is written the standard way once the user is done typing.
    const text = this.text();
    if (this.selection() !== 'multiple' && text.trim() !== '' && this.parse(text)) {
      this.text.set(this.valueKey());
    }
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open.set(true);
    } else if (
      this.selection() === 'multiple' &&
      (event.key === 'Delete' || event.key === 'Backspace')
    ) {
      event.preventDefault();
      this.resetValue();
    }
  }

  protected resetValue(): void {
    this.commit(this.empty() as Selection);
  }

  protected clearAndFocus(): void {
    this.resetValue();
    this.inputElement().nativeElement.focus();
  }

  /** Close the popover, and give the focus back to the input when `returnFocus` is true. */
  protected close(returnFocus: boolean): void {
    this.open.set(false);
    if (returnFocus) this.inputElement().nativeElement.focus();
  }

  protected onDismiss(reason: PopoverDismissReason): void {
    if (reason === 'escape') this.close(true);
    else this.open.set(false);
  }

  protected onCalendarChange(next: SelectionValue<M> | undefined): void {
    if (next === undefined) return;
    this.commit(next as Selection);
    const closes = this.closeOnSelect() ?? this.selection() !== 'multiple';
    if (closes && !isEmptySelection(next as Selection)) this.close(true);
  }
}
