import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterEveryRender,
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
import { definedOnly } from './defined-only';
import { CalendrixPropsDirective } from './props-directive';

/**
 * A time input made of segments (hour, minute, optional seconds, AM/PM). Each segment is a
 * spinbutton: type digits, or use the up and down arrow keys. It has no styles of its own: use the
 * `calendrix-*` classes. Use `[(value)]` to read and set the time.
 */
@Component({
  selector: 'calendrix-time-field',
  imports: [CalendrixPropsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="calendrix-time-field" [calendrixProps]="view().root" [calendrixHandlers]="false">
      @for (item of view().segments; track item.segment.type) {
        @if (item.separator) {
          <span class="calendrix-separator" aria-hidden="true">:</span>
        }
        <span
          class="calendrix-segment"
          [calendrixProps]="item.props"
          [calendrixHandlers]="false"
          (keydown)="onKeydown(item.segment.type, $event)"
          (focus)="field.focusSegment(item.segment.type)"
          >{{ item.segment.text }}</span
        >
      }
    </div>
  `,
})
export class CalendrixTimeField implements OnInit {
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

  /** Created again in `ngOnInit`: the core reads some options only when it is created. */
  protected field = createTimeField({});
  protected readonly state = signal(this.field.getState());
  private unsubscribe: () => void = () => undefined;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** When typing completes a segment the core makes the next one active: it needs the real focus. */
  private focusPending = false;

  private readonly handleChange = (next: TimeValue | null) => this.value.set(next);

  private readonly options = computed(() =>
    definedOnly<TimeFieldOptions>({
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
      onChange: this.handleChange,
    }),
  );

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
      if (!this.focusPending) return;
      this.focusPending = false;
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

  protected onKeydown(type: TimeSegmentType, event: KeyboardEvent): void {
    const before = this.field.getState();
    this.field.handleKeyDown(type, event);
    if (this.field.getState() !== before) this.focusPending = true;
  }
}
