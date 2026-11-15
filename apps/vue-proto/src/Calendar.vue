<script setup lang="ts" generic="M extends SelectionMode = 'single'">
import type { CalendarOptions, SelectionMode, SelectionValue } from '@calendrix/core';
import { nextTick, useTemplateRef } from 'vue';
import { useCalendar, vueProps } from './use-calendar';

const props = defineProps<{
  selection?: M;
  modelValue?: SelectionValue<M>;
  system?: CalendarOptions<M>['system'];
  locale?: CalendarOptions<M>['locale'];
  direction?: CalendarOptions<M>['direction'];
  weekStart?: CalendarOptions<M>['weekStart'];
  plugins?: CalendarOptions<M>['plugins'];
}>();

const emit = defineEmits<{ 'update:modelValue': [value: SelectionValue<M>] }>();

const root = useTemplateRef<HTMLElement>('root');

const { calendar, state } = useCalendar<M>(() => ({
  selection: props.selection,
  value: props.modelValue,
  system: props.system,
  locale: props.locale,
  direction: props.direction,
  weekStart: props.weekStart,
  plugins: props.plugins,
  onChange: (next: SelectionValue<M>) => emit('update:modelValue', next),
}));

/** The focused day has tabindex 0: after the render it has to get the real DOM focus. */
function focusFocusedCell(): void {
  root.value?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();
}

function onGridKeydown(event: KeyboardEvent): void {
  if (!calendar.handleKeyDown(event)) return;
  void nextTick(focusFocusedCell);
}
</script>

<template>
  <div ref="root" class="calendrix-calendar" v-bind="vueProps(calendar.getRootProps(), false)">
    <div class="calendrix-header">
      <button
        type="button"
        class="calendrix-nav calendrix-prev"
        v-bind="vueProps(calendar.getPrevButtonProps())"
      >
        ‹
      </button>
      <div class="calendrix-title" aria-live="polite">
        <span class="calendrix-title-text">{{ state.monthName }}</span>
        <span class="calendrix-title-text">{{ state.yearLabel }}</span>
      </div>
      <button
        type="button"
        class="calendrix-nav calendrix-next"
        v-bind="vueProps(calendar.getNextButtonProps())"
      >
        ›
      </button>
    </div>

    <div
      class="calendrix-grid"
      data-view="days"
      v-bind="vueProps(calendar.getGridProps(), false)"
      @keydown="onGridKeydown"
      @pointerleave="calendar.previewTo(null)"
    >
      <div role="row" class="calendrix-weekdays">
        <div
          v-for="label in state.weekdayLabels"
          :key="label.long"
          role="columnheader"
          class="calendrix-weekday"
          :aria-label="label.long"
        >
          {{ label.short }}
        </div>
      </div>
      <div v-for="(week, index) in state.grids[0]?.weeks" :key="index" role="row" class="calendrix-week">
        <div
          v-for="cell in week"
          :key="`${cell.date.year}-${cell.date.month}-${cell.date.day}`"
          class="calendrix-day"
          v-bind="vueProps(calendar.getDayProps(cell.date))"
          @pointerenter="calendar.previewTo(cell.date)"
        >
          {{ cell.label }}
        </div>
      </div>
    </div>
  </div>
</template>