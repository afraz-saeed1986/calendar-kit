import { NgTemplateOutlet } from '@angular/common';
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
  output,
  signal,
  type OnInit,
} from '@angular/core';
import {
  createCalendar,
  type CalendarDate,
  type CalendarOptions,
  type ElementProps,
  type SelectionMode,
  type SelectionValue,
} from '@calendrix/core';
import { CalendrixPropsDirective } from './props-directive';

const COLUMNS = 3;

const cellKey = (date: CalendarDate) => `${date.year}-${date.month}-${date.day}`;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** The options the user set: an input that was not set must not reach the core as `undefined`. */
function definedOnly<T>(options: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) as T;
}

/**
 * A month calendar with the ARIA grid pattern. The month and the year in the header are buttons:
 * they open a grid of months and a page of years. `visibleMonths` shows up to three months side
 * by side, and `selection` picks one day, a range or many days. It has no styles of its own: use
 * the `calendrix-*` classes and the `data-*` attributes. Use `[(value)]` to read and set the value.
 */
@Component({
  selector: 'calendrix-calendar',
  imports: [NgTemplateOutlet, CalendrixPropsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="calendrix-calendar"
      [calendrixProps]="view().root"
      [calendrixHandlers]="false"
      [attr.data-view]="view().state.view"
      [attr.data-months]="view().multi ? view().state.visibleMonths : null"
      (keydown)="onRootKeydown($event)"
    >
      @if (view().multi) {
        <div class="calendrix-panels" (pointerleave)="onPointerLeave()">
          @for (g of view().grids; track g.key) {
            <div class="calendrix-panel">
              <ng-container
                [ngTemplateOutlet]="header"
                [ngTemplateOutletContext]="{ $implicit: g }"
              ></ng-container>
              <ng-container
                [ngTemplateOutlet]="dayGrid"
                [ngTemplateOutletContext]="{ $implicit: g }"
              ></ng-container>
            </div>
          }
        </div>
      } @else {
        @if (view().grids[0]; as g) {
          <ng-container
            [ngTemplateOutlet]="header"
            [ngTemplateOutletContext]="{ $implicit: g }"
          ></ng-container>

          @if (view().state.view === 'days') {
            <ng-container
              [ngTemplateOutlet]="dayGrid"
              [ngTemplateOutletContext]="{ $implicit: g }"
            ></ng-container>
          } @else {
            <div
              class="calendrix-grid"
              [attr.data-view]="view().state.view"
              [calendrixProps]="view().gridProps"
              [calendrixHandlers]="false"
              (keydown)="onGridKeydown($event)"
            >
              @if (view().state.view === 'months') {
                @for (row of view().monthRows; track $index) {
                  <div role="row" class="calendrix-row">
                    @for (item of row; track item.cell.month) {
                      <div
                        class="calendrix-month"
                        [calendrixProps]="item.props"
                        [calendrixHandlers]="false"
                        (click)="switchView(item.props)"
                      >
                        {{ item.cell.label }}
                      </div>
                    }
                  </div>
                }
              } @else {
                @for (row of view().yearRows; track $index) {
                  <div role="row" class="calendrix-row">
                    @for (item of row; track item.cell.year) {
                      <div
                        class="calendrix-year"
                        [calendrixProps]="item.props"
                        [calendrixHandlers]="false"
                        (click)="switchView(item.props)"
                      >
                        {{ item.cell.label }}
                      </div>
                    }
                  </div>
                }
              }
            </div>
          }
        }
      }
    </div>

    <ng-template #header let-g>
      <div class="calendrix-header">
        @if (g.index === 0) {
          <button
            type="button"
            class="calendrix-nav calendrix-prev"
            [calendrixProps]="view().prev"
          >
            <svg
              class="calendrix-chevron"
              aria-hidden="true"
              focusable="false"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path
                d="M10 3 5 8l5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="calendrix-title" aria-live="polite">
            @if (view().state.view !== 'years') {
              <button
                type="button"
                class="calendrix-title-button calendrix-month-button"
                [calendrixProps]="view().monthButton"
                [calendrixHandlers]="false"
                (click)="switchView(view().monthButton)"
              >
                {{ view().state.monthName }}
              </button>
            }
            <button
              type="button"
              class="calendrix-title-button calendrix-year-button"
              [calendrixProps]="view().yearButton"
              [calendrixHandlers]="false"
              (click)="switchView(view().yearButton)"
            >
              {{ view().state.view === 'years' ? view().state.yearsLabel : view().state.yearLabel }}
            </button>
          </div>
        } @else {
          <span class="calendrix-nav-spacer" aria-hidden="true"></span>
          <div class="calendrix-title">
            <span class="calendrix-title-text">{{ g.grid.monthName }}</span>
            <span class="calendrix-title-text">{{ g.grid.yearLabel }}</span>
          </div>
        }

        @if (g.isLast) {
          <button
            type="button"
            class="calendrix-nav calendrix-next"
            [calendrixProps]="view().next"
          >
            <svg
              class="calendrix-chevron"
              aria-hidden="true"
              focusable="false"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path
                d="M6 3l5 5-5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        } @else {
          <span class="calendrix-nav-spacer" aria-hidden="true"></span>
        }
      </div>
    </ng-template>

    <ng-template #dayGrid let-g>
      <div
        class="calendrix-grid"
        data-view="days"
        [calendrixProps]="g.props"
        [calendrixHandlers]="false"
        (keydown)="onGridKeydown($event)"
        (pointerleave)="onGridPointerLeave()"
      >
        <div role="row" class="calendrix-weekdays">
          @for (label of view().state.weekdayLabels; track label.long) {
            <div role="columnheader" class="calendrix-weekday" [attr.aria-label]="label.long">
              {{ label.short }}
            </div>
          }
        </div>
        @for (week of g.weeks; track $index) {
          <div role="row" class="calendrix-week">
            @for (day of week; track day.key) {
              @if (day.props) {
                <div
                  class="calendrix-day"
                  [calendrixProps]="day.props"
                  (pointerenter)="calendar.previewTo(day.cell.date)"
                >
                  {{ day.cell.label }}
                </div>
              } @else {
                <!-- With several months every day shows once: the days of the other months stay empty. -->
                <div role="presentation" class="calendrix-day-empty"></div>
              }
            }
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class CalendrixCalendar<M extends SelectionMode = 'single'> implements OnInit {
  /** One day (default), a range with a start and an end, or any number of separate days. */
  readonly selection = input<M>('single' as M);
  /** The selection. Use `[(value)]`. The type follows `selection`. */
  readonly value = model<SelectionValue<M>>();
  readonly defaultValue = input<SelectionValue<M>>();

  readonly system = input<CalendarOptions<M>['system']>();
  readonly locale = input<CalendarOptions<M>['locale']>();
  readonly direction = input<CalendarOptions<M>['direction']>();
  readonly weekStart = input<CalendarOptions<M>['weekStart']>();
  readonly plugins = input<CalendarOptions<M>['plugins']>();

  readonly focusedDate = input<CalendarDate>();
  readonly focusedDateChange = output<CalendarDate>();

  /** How many months are shown at once: 1 (default), 2 or 3. */
  readonly visibleMonths = input<number>();
  readonly allowUnavailableInRange = input<boolean>();
  readonly maxSelected = input<number>();

  readonly minDate = input<CalendarDate>();
  readonly maxDate = input<CalendarDate>();
  readonly isDateUnavailable = input<(date: CalendarDate) => boolean>();

  readonly labels = input<CalendarOptions<M>['labels']>();
  readonly timeZone = input<string>();
  readonly now = input<() => Date>();

  /**
   * Created again in `ngOnInit`, when the inputs are known: the core reads some options (`now`,
   * `timeZone`, `defaultValue`, `focusedDate`) only when it is created.
   */
  protected calendar = createCalendar<M>({});
  /** The snapshot of the core: the same object until something changes. */
  protected readonly state = signal(this.calendar.getState());
  private unsubscribe: () => void = () => undefined;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** The focused day has tabindex 0: after the next render it has to get the real DOM focus. */
  private focusPending = false;

  private readonly handleChange = (next: SelectionValue<M>) => this.value.set(next);
  private readonly handleFocusedDate = (date: CalendarDate) => this.focusedDateChange.emit(date);

  private readonly options = computed(() =>
    definedOnly<Partial<CalendarOptions<M>>>({
      selection: this.selection(),
      value: this.value(),
      defaultValue: this.defaultValue(),
      system: this.system(),
      locale: this.locale(),
      direction: this.direction(),
      weekStart: this.weekStart(),
      plugins: this.plugins(),
      focusedDate: this.focusedDate(),
      visibleMonths: this.visibleMonths(),
      allowUnavailableInRange: this.allowUnavailableInRange(),
      maxSelected: this.maxSelected(),
      minDate: this.minDate(),
      maxDate: this.maxDate(),
      isDateUnavailable: this.isDateUnavailable(),
      labels: this.labels(),
      timeZone: this.timeZone(),
      now: this.now(),
      onChange: this.handleChange,
      onFocusedDateChange: this.handleFocusedDate,
    }),
  );

  /** Everything the template needs, computed once for each state. */
  protected readonly view = computed(() => {
    const state = this.state();
    const calendar = this.calendar;
    const multi = state.view === 'days' && state.visibleMonths > 1;
    const lastIndex = state.grids.length - 1;

    return {
      state,
      multi,
      root: calendar.getRootProps(),
      gridProps: calendar.getGridProps(),
      prev: calendar.getPrevButtonProps(),
      next: calendar.getNextButtonProps(),
      monthButton: calendar.getMonthButtonProps(),
      yearButton: calendar.getYearButtonProps(),
      grids: state.grids.map((grid, index) => ({
        grid,
        index,
        key: `${grid.year}-${grid.month}`,
        props: calendar.getGridProps(index),
        isLast: state.view !== 'days' || index === lastIndex,
        weeks: grid.weeks.map((week) =>
          week.map((cell) => ({
            cell,
            key: cellKey(cell.date),
            // `null` marks a day of another month, left empty when several months are shown.
            props: multi && cell.isOutsideMonth ? null : calendar.getDayProps(cell.date),
          })),
        ),
      })),
      monthRows: chunk(
        state.months.map((cell) => ({ cell, props: calendar.getMonthProps(cell.month) })),
        COLUMNS,
      ),
      yearRows: chunk(
        state.years.map((cell) => ({ cell, props: calendar.getYearProps(cell.year) })),
        COLUMNS,
      ),
    };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.unsubscribe();
      this.calendar.destroy();
    });

    effect(() => this.calendar.setOptions(this.options()));

    afterEveryRender(() => {
      if (!this.focusPending) return;
      this.focusPending = false;
      this.focusFocusedCell();
    });
  }

  ngOnInit(): void {
    this.calendar.destroy();
    this.calendar = createCalendar<M>(this.options());
    this.unsubscribe = this.calendar.subscribe(() => this.state.set(this.calendar.getState()));
    this.state.set(this.calendar.getState());
  }

  private focusFocusedCell(): void {
    this.host.nativeElement.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const before = this.calendar.getState();
    if (!this.calendar.handleKeyDown(event)) return;
    // A changed state renders first, and the hook above moves the focus afterwards.
    if (this.calendar.getState() === before) this.focusFocusedCell();
    else this.focusPending = true;
  }

  /** Escape leaves the months or the years from anywhere in the calendar, also from a button. */
  protected onRootKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented || this.calendar.getState().view === 'days') {
      return;
    }
    event.preventDefault();
    this.calendar.setView('days');
    this.focusPending = true;
  }

  /** Buttons and cells that change the view: the grid they lead to takes the focus. */
  protected switchView(props: ElementProps<{ click: () => void }>): void {
    props.handlers.click();
    this.focusPending = true;
  }

  protected onPointerLeave(): void {
    this.calendar.previewTo(null);
  }

  protected onGridPointerLeave(): void {
    if (!this.view().multi) this.calendar.previewTo(null);
  }
}