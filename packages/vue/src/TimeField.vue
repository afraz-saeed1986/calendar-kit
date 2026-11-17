<script setup lang="ts">
import type { TimeFieldOptions, TimeSegmentType, TimeValue } from '@calendrix/core';
import { useTemplateRef, watch } from 'vue';
import { toVueProps } from './props';
import { useTimeField } from './use-time-field';

/**
 * A time input made of segments (hour, minute, optional seconds, AM/PM). Each segment is a
 * spinbutton: type digits, or use the up and down arrow keys. It has no styles of its own:
 * style the `calendrix-*` classes, or import `@calendrix/vue/styles.css`. It accepts every
 * option of `createTimeField`; `modelValue` is the `value` option, so `v-model` makes the field
 * controlled.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: TimeValue | null;
    defaultValue?: TimeValue | null;
    locale?: string;
    hourCycle?: TimeFieldOptions['hourCycle'];
    showSeconds?: boolean;
    hourStep?: number;
    minuteStep?: number;
    secondStep?: number;
    minTime?: TimeValue;
    maxTime?: TimeValue;
    labels?: TimeFieldOptions['labels'];
  }>(),
  // A Vue boolean prop that is not passed becomes `false`; here "not passed" must stay `undefined`.
  { showSeconds: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [value: TimeValue | null] }>();

const root = useTemplateRef<HTMLElement>('root');

const { field, state } = useTimeField(() => ({
  value: props.modelValue,
  defaultValue: props.defaultValue,
  locale: props.locale,
  hourCycle: props.hourCycle,
  showSeconds: props.showSeconds,
  hourStep: props.hourStep,
  minuteStep: props.minuteStep,
  secondStep: props.secondStep,
  minTime: props.minTime,
  maxTime: props.maxTime,
  labels: props.labels,
  onChange: (next: TimeValue | null) => emit('update:modelValue', next),
}));

// When typing completes a segment the core makes the next one active and asks for the focus.
watch(
  () => state.value.focusRequest,
  () => {
    const type = state.value.activeSegment;
    if (!type) return;
    root.value?.querySelector<HTMLElement>(`[data-segment="${type}"]`)?.focus();
  },
  { flush: 'post' },
);

function onKeydown(type: TimeSegmentType, event: KeyboardEvent): void {
  field.handleKeyDown(type, event);
}
</script>

<template>
  <div ref="root" class="calendrix-time-field" v-bind="toVueProps(field.getRootProps(), false)">
    <template v-for="segment in state.segments" :key="segment.type">
      <span
        v-if="segment.type === 'minute' || segment.type === 'second'"
        class="calendrix-separator"
        aria-hidden="true"
      >
        :
      </span>
      <span
        v-bind="toVueProps(field.getSegmentProps(segment.type), false)"
        class="calendrix-segment"
        @keydown="onKeydown(segment.type, $event)"
        @focus="field.focusSegment(segment.type)"
      >
        {{ segment.text }}
      </span>
    </template>
  </div>
</template>