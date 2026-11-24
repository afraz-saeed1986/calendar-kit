<script setup lang="ts" generic="M extends SelectionMode = 'single'">
import type { Calendar, CalendarState, SelectionMode } from '@calendrix/core';
import { computed } from 'vue';
import { toVueProps } from './props';

const props = defineProps<{
  calendar: Calendar<M>;
  state: CalendarState<M>;
  /** Which visible month this header sits above. */
  index: number;
}>();

const isFirst = computed(() => props.index === 0);
/** The next button sits above the last month; the months and years views have one header. */
const isLast = computed(
  () => props.state.view !== 'days' || props.index === props.state.grids.length - 1,
);
</script>

<template>
  <div class="calendrix-header">
    <button
      v-if="isFirst"
      type="button"
      v-bind="toVueProps(calendar.getPrevButtonProps())"
      class="calendrix-nav calendrix-prev"
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
    <span v-else class="calendrix-nav-spacer" aria-hidden="true" />

    <div v-if="isFirst" class="calendrix-title" aria-live="polite">
      <button
        v-if="state.view !== 'years'"
        type="button"
        v-bind="toVueProps(calendar.getMonthButtonProps())"
        class="calendrix-title-button calendrix-month-button"
      >
        {{ state.monthName }}
      </button>
      <button
        type="button"
        v-bind="toVueProps(calendar.getYearButtonProps())"
        class="calendrix-title-button calendrix-year-button"
      >
        {{ state.view === 'years' ? state.yearsLabel : state.yearLabel }}
      </button>
    </div>
    <div v-else class="calendrix-title">
      <span class="calendrix-title-text">{{ state.grids[index]?.monthName }}</span>
      <span class="calendrix-title-text">{{ state.grids[index]?.yearLabel }}</span>
    </div>

    <button
      v-if="isLast"
      type="button"
      v-bind="toVueProps(calendar.getNextButtonProps())"
      class="calendrix-nav calendrix-next"
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
    <span v-else class="calendrix-nav-spacer" aria-hidden="true" />
  </div>
</template>
