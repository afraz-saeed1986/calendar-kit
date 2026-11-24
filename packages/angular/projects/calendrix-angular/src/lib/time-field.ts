import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterEveryRender,
  booleanAttribute,
  forwardRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  type OnInit,
} from '@angular/core';
import {
  createTimeField,
  type HourCycle,
  type TimeFieldLabels,
  type TimeFieldOptions,
  type TimeSegmentType,
  type TimeValue,
} from '@calendrix/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { CalendrixPropsDirective } from './props-directive';

/**
 * A time input made of segments (hour, minute, optional seconds, AM/PM). Each segment is a
 * spinbutton: type digits, or use the up and down arrow keys. It has no styles of its own: use the
 * `calendrix-*` classes. Use `[(value)]` to read and set the time.
 */
@Component({
  selector: 'calendrix-time-field',
  imports: [CalendrixPropsDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CalendrixTimeField), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="calendrix-time-field"
      [calendrixProps]="view().root"
      [calendrixHandlers]="false"
      (focusout)="onFocusOut($event)"
    >
      @for (item of view().segments; track item.segment.type) {
        @if (item.separator) {
          <span class="calendrix-separator" aria-hidden="true">:</span>
        }
        <span
          class="calendrix-segment"
          [calendrixProps]="item.props"
          [calendrixHandlers]="false"
          (keydown)="onKeydown(item.segment.type, $event)"
          (beforeinput)="onBeforeInput(item.segment.type, $event)"
          (input)="onInput(item.segment.type, $event)"
          (focus)="field.focusSegment(item.segment.type)"
          >{{ item.segment.text }}</span
        >
      }
    </div>
  `,
})
export class CalendrixTimeField implements OnInit, ControlValueAccessor {
  /** The time. Use `[(value)]`. `null` means an empty field. */
  readonly value = model<TimeValue | null>();
  readonly defaultValue = input<TimeValue | null>();

  /** BCP 47 locale for numerals and the AM/PM text. Default: 'en-US'. */
  readonly locale = input<string>();
  /** 12 or 24. Default: the locale's own habit. */
  readonly hourCycle = input<HourCycle>();
  /** Show a seconds segment. Default: false. */
  readonly showSeconds = input<boolean>();
  /** Step of the up and down arrows. Default: 1. */
  readonly hourStep = input<number>();
  readonly minuteStep = input<number>();
  readonly secondStep = input<number>();
  /** Values outside this range are rejected. */
  readonly minTime = input<TimeValue>();
  readonly maxTime = input<TimeValue>();
  readonly labels = input<Partial<TimeFieldLabels>>();
  /** The user cannot change anything (ADR 0022). A form can also disable the field. */
  readonly disabledInput = input(false, { alias: 'disabled', transform: booleanAttribute });

  /** Created again in `ngOnInit`: the core reads some options only when it is created. */
  protected field = createTimeField({});
  protected readonly state = signal(this.field.getState());
  private unsubscribe: () => void = () => undefined;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The last `focusRequest` of the core that this component has seen (see `TimeFieldState`). */
  private seenFocusRequest = 0;

  private readonly handleChange = (next: TimeValue | null) => {
    this.value.set(next);
    this.onChangeFn(next);
  };

  private readonly options = computed<TimeFieldOptions>(() => ({
    value: this.value(),
    defaultValue: this.defaultValue(),
    locale: this.locale(),
    hourCycle: this.hourCycle(),
    showSeconds: this.showSeconds(),
    hourStep: this.hourStep(),
    minuteStep: this.minuteStep(),
    secondStep: this.secondStep(),
    minTime: this.minTime(),
    maxTime: this.maxTime(),
    labels: this.labels(),
    disabled: this.disabled(),
    onChange: this.handleChange,
  }));

  protected readonly view = computed(() => {
    const state = this.state();
    return {
      root: this.field.getRootProps(),
      segments: state.segments.map((segment) => ({
        segment,
        props: this.field.getSegmentProps(segment.type),
        separator: segment.type === 'minute' || segment.type === 'second',
      })),
    };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.unsubscribe();
      this.field.destroy();
    });

    effect(() => this.field.setOptions(this.options()));

    afterEveryRender(() => {
      const request = this.state().focusRequest;
      if (request === this.seenFocusRequest) return;
      this.seenFocusRequest = request;
      const type = this.state().activeSegment;
      if (!type) return;
      this.host.nativeElement.querySelector<HTMLElement>(`[data-segment="${type}"]`)?.focus();
    });
  }

  ngOnInit(): void {
    this.field.destroy();
    this.field = createTimeField(this.options());
    this.unsubscribe = this.field.subscribe(() => this.state.set(this.field.getState()));
    this.state.set(this.field.getState());
  }

  // ControlValueAccessor: a form writes the time in and hears about changes made by the user.
  private onChangeFn: (value: TimeValue | null) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  private readonly formDisabled = signal(false);
  /** Disabled by the `disabled` input or by the form. */
  protected readonly disabled = computed(() => this.disabledInput() || this.formDisabled());

  writeValue(value: unknown): void {
    // null or undefined from a form (a reset, a new control) means an empty field.
    this.value.set((value ?? null) as TimeValue | null);
  }

  registerOnChange(fn: (value: TimeValue | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /** The control is touched when the focus leaves the whole field, not between its segments. */
  protected onFocusOut(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) this.onTouchedFn();
  }

  protected onKeydown(type: TimeSegmentType, event: KeyboardEvent): void {
    // Typing that completes a segment gives a new `focusRequest`; the hook above moves the focus.
    this.field.handleKeyDown(type, event);
  }

  /** Text from an on-screen keyboard (ADR 0024). */
  protected onBeforeInput(type: TimeSegmentType, event: Event): void {
    this.field.handleBeforeInput(type, event as InputEvent);
  }

  /**
   * A composition cannot be cancelled: the browser has written into the segment. Write the text of
   * the state back into the same text node (Angular keeps that node).
   */
  protected onInput(type: TimeSegmentType, event: Event): void {
    if (!(event as InputEvent).isComposing) return;
    const text = this.state().segments.find((segment) => segment.type === type)?.text;
    const node = (event.currentTarget as HTMLElement).firstChild;
    if (text !== undefined && node?.nodeType === Node.TEXT_NODE) (node as Text).data = text;
  }
}
