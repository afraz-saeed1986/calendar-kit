<script setup lang="ts" generic="M extends SelectionMode = 'single'">
import type { Calendar, CalendarState, MonthGrid, SelectionMode } from '@calendrix/core';
import { toVueProps } from './props';

defineProps<{
  calendar: Calendar<M>;
  state: CalendarState<M>;
  grid: MonthGrid;
  index: number;
  /** Several months side by side: every day shows once, the days of other months stay empty. */
  multi: boolean;
}>();
</script>

<template>
  <div
    v-bind="toVueProps(calendar.getGridProps(index), false)"
    class="calendrix-grid"
    data-view="days"
    @keydown="calendar.handleKeyDown($event)"
    @pointerleave="multi ? undefined : calendar.previewTo(null)"
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
    <div
      v-for="(week, weekIndex) in grid.weeks"
      :key="weekIndex"
      role="row"
      class="calendrix-week"
      :aria-hidden="multi && week.every((cell) => cell.isOutsideMonth) ? 'true' : undefined"
    >
      <template v-for="cell in week" :key="`${cell.date.year}-${cell.date.month}-${cell.date.day}`">
        <div v-if="multi && cell.isOutsideMonth" role="presentation" class="calendrix-day-empty" />
        <div
          v-else
          v-bind="toVueProps(calendar.getDayProps(cell.date))"
          class="calendrix-day"
          @pointerenter="calendar.previewTo(cell.date)"
        >
          {{ cell.label }}
        </div>
      </template>
    </div>
  </div>
</template>