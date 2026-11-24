<script setup lang="ts" generic="M extends SelectionMode = 'single'">
import type { CalendarDate, CalendarOptions, SelectionMode, SelectionValue } from '@calendrix/core';
import { computed, useTemplateRef, watch } from 'vue';
import CalendarDays from './CalendarDays.vue';
import CalendarHeader from './CalendarHeader.vue';
import { toVueProps } from './props';
import { useCalendar } from './use-calendar';

/**
 * A month calendar with the ARIA grid pattern. The month and the year in the header are buttons:
 * they open a grid of months and a page of years. `visibleMonths` shows up to three months side
 * by side, and `selection` picks one day, a range or many days. It has no styles of its own:
 * style the `calendrix-*` classes and the `data-*` attributes, or import
 * `@calendrix/vue/styles.css`. It accepts every option of `createCalendar`; `modelValue` is the
 * `value` option, so `v-model` makes the calendar controlled.
 */
const props = withDefaults(
  defineProps<{
    selection?: M;
    modelValue?: SelectionValue<M>;
    defaultValue?: SelectionValue<M>;
    system?: CalendarOptions<M>['system'];
    locale?: string;
    direction?: CalendarOptions<M>['direction'];
    weekStart?: CalendarOptions<M>['weekStart'];
    focusedDate?: CalendarDate;
    visibleMonths?: number;
    allowUnavailableInRange?: boolean;
    maxSelected?: number;
    minDate?: CalendarDate;
    maxDate?: CalendarDate;
    isDateUnavailable?: (date: CalendarDate) => boolean;
    labels?: CalendarOptions<M>['labels'];
    timeZone?: string;
    now?: () => Date;
    plugins?: CalendarOptions<M>['plugins'];
    /** The user cannot change anything (ADR 0022). */
    disabled?: boolean;
  }>(),
  // A Vue boolean prop that is not passed becomes `false`; here "not passed" must stay `undefined`.
  { allowUnavailableInRange: undefined },
);

const emit = defineEmits<{
  'update:modelValue': [value: SelectionValue<M>];
  focusedDateChange: [date: CalendarDate];
}>();

const root = useTemplateRef<HTMLElement>('root');
const COLUMNS = 3;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const { calendar, state } = useCalendar<M>(() => ({
  selection: props.selection,
  value: props.modelValue,
  defaultValue: props.defaultValue,
  system: props.system,
  locale: props.locale,
  direction: props.direction,
  weekStart: props.weekStart,
  focusedDate: props.focusedDate,
  visibleMonths: props.visibleMonths,
  allowUnavailableInRange: props.allowUnavailableInRange,
  maxSelected: props.maxSelected,
  minDate: props.minDate,
  maxDate: props.maxDate,
  isDateUnavailable: props.isDateUnavailable,
  labels: props.labels,
  timeZone: props.timeZone,
  now: props.now,
  plugins: props.plugins,
  disabled: props.disabled,
  onChange: (next: SelectionValue<M>) => emit('update:modelValue', next),
  onFocusedDateChange: (date: CalendarDate) => emit('focusedDateChange', date),
}));

/** Several months side by side, in the days view. */
const multi = computed(() => state.value.view === 'days' && state.value.visibleMonths > 1);

/** The focused cell has tabindex 0: when the core asks for it, it gets the real DOM focus. */
function focusFocusedCell(): void {
  root.value?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();
}

// `flush: 'post'` runs after the DOM is updated. A handled key gives a new `focusRequest`.
watch(() => state.value.focusRequest, focusFocusedCell, { flush: 'post' });

/** Escape leaves the months or the years from anywhere in the calendar, also from a button. */
function onRootKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented || state.value.view === 'days') return;
  event.preventDefault();
  calendar.setView('days');
}
</script>

<template>
  <div
    ref="root"
    class="calendrix-calendar"
    v-bind="toVueProps(calendar.getRootProps(), false)"
    :data-view="state.view"
    :data-months="multi ? state.visibleMonths : undefined"
    @keydown="onRootKeydown"
  >
    <div v-if="multi" class="calendrix-panels" @pointerleave="calendar.previewTo(null)">
      <div
        v-for="(grid, index) in state.grids"
        :key="`${grid.year}-${grid.month}`"
        class="calendrix-panel"
      >
        <CalendarHeader :calendar="calendar" :state="state" :index="index" />
        <CalendarDays :calendar="calendar" :state="state" :grid="grid" :index="index" multi />
      </div>
    </div>

    <template v-else>
      <CalendarHeader :calendar="calendar" :state="state" :index="0" />

      <CalendarDays
        v-if="state.view === 'days' && state.grids[0]"
        :calendar="calendar"
        :state="state"
        :grid="state.grids[0]"
        :index="0"
        :multi="false"
      />

      <div
        v-else-if="state.view !== 'days'"
        v-bind="toVueProps(calendar.getGridProps(), false)"
        class="calendrix-grid"
        :data-view="state.view"
        @keydown="calendar.handleKeyDown($event)"
      >
        <template v-if="state.view === 'months'">
          <div
            v-for="(row, rowIndex) in chunk(state.months, COLUMNS)"
            :key="rowIndex"
            role="row"
            class="calendrix-row"
          >
            <div
              v-for="cell in row"
              :key="cell.month"
              v-bind="toVueProps(calendar.getMonthProps(cell.month))"
              class="calendrix-month"
            >
              {{ cell.label }}
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(row, rowIndex) in chunk(state.years, COLUMNS)"
            :key="rowIndex"
            role="row"
            class="calendrix-row"
          >
            <div
              v-for="cell in row"
              :key="cell.year"
              v-bind="toVueProps(calendar.getYearProps(cell.year))"
              class="calendrix-year"
            >
              {{ cell.label }}
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
