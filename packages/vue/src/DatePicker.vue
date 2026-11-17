<script setup lang="ts" generic="M extends SelectionMode = 'single'">
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
  type Selection,
  type SelectionMode,
  type SelectionValue,
} from '@calendrix/core';
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import Calendar from './Calendar.vue';
import type { DatePickerLabels } from './date-picker-labels';
import { usePickerPopover } from './use-picker-popover';

/**
 * A text input and a popover with a calendar, for one day, a range or many days (no time: see
 * `DateTimePicker`). A day or a range can be typed or picked; a list of days is picked, and the
 * input shows it as text. It has no styles of its own, see `@calendrix/vue/styles.css`.
 * `modelValue` is the selection; `v-model` makes the picker controlled.
 */
const props = withDefaults(
  defineProps<{
    /** One day (default), a range with a start and an end, or any number of separate days. */
    selection?: M;
    modelValue?: SelectionValue<M>;
    defaultValue?: SelectionValue<M>;
    system?: CalendarSystem;
    locale?: string;
    plugins?: CalendarOptions['plugins'];
    minDate?: CalendarDate;
    maxDate?: CalendarDate;
    isDateUnavailable?: (date: CalendarDate) => boolean;
    weekStart?: CalendarOptions['weekStart'];
    direction?: CalendarOptions['direction'];
    timeZone?: string;
    now?: () => Date;
    /** How many months the calendar shows. Default: 2 for `range`, 1 otherwise. */
    visibleMonths?: number;
    allowUnavailableInRange?: boolean;
    maxSelected?: number;
    /** Close the popover when the selection is complete. Default: true, except for `multiple`. */
    closeOnSelect?: boolean;
    labels?: DatePickerLabels;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    /** Render the popover in `document.body` (default). Pass `false` to render it next to the input. */
    portal?: boolean;
  }>(),
  // A Vue boolean prop that is not passed becomes `false`; "not passed" must stay `undefined`.
  {
    system: 'gregory',
    locale: 'en-US',
    portal: true,
    allowUnavailableInRange: undefined,
    closeOnSelect: undefined,
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: SelectionValue<M>] }>();

// Typing a date in a calendar from a plugin works before the popover has ever been opened.
function registerPlugins(plugins: CalendarOptions['plugins']): void {
  for (const plugin of plugins ?? []) {
    for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
  }
}
registerPlugins(props.plugins);
watch(() => props.plugins, registerPlugins);

const selection = computed(() => (props.selection ?? 'single') as M);
const empty = computed(() => (selection.value === 'multiple' ? [] : null) as Selection);

const internalValue = shallowRef<Selection>((props.defaultValue ?? empty.value) as Selection);
const isControlled = computed(() => props.modelValue !== undefined);
const value = computed(
  () => (isControlled.value ? props.modelValue : internalValue.value) as Selection,
);
/** The selection in the calendar system on screen. */
const shown = computed(() => toSystem(value.value, props.system));

const touched = ref(false);

const { open, close, inputRef, wrapperRef, popoverRef, dialogId, popoverStyle, trapTab } =
  usePickerPopover({ portal: () => props.portal });
const text_ = computed(() => pickerLabelsFor(props.locale, props.labels, 'date'));

const format = (next: Selection) => formatSelection(next, props.locale, props.labels?.datesSelected);
const valueKey = computed(() => format(shown.value));

const text = ref(valueKey.value);
/** True while the value is changing because the user typed it: the text must stay as typed. */
let typing = false;

watch(valueKey, () => {
  if (typing) {
    typing = false;
    return;
  }
  text.value = valueKey.value;
});

function commit(next: Selection): void {
  if (!isControlled.value) internalValue.value = next;
  emit('update:modelValue', next as SelectionValue<M>);
}

/** A typed text: one date, or a range. A list of days is not typed. */
function parse(next: string): Selection {
  return selection.value === 'range'
    ? parseDateRange(next, { locale: props.locale, system: props.system })
    : parseDate(next, { locale: props.locale, system: props.system });
}

function typed(next: string): void {
  text.value = next;
  if (next.trim() === '') {
    if (!isEmptySelection(value.value)) {
      typing = true;
      commit(empty.value);
    }
  } else {
    const parsed = parse(next);
    if (!parsed) return;
    if (format(parsed) !== valueKey.value) typing = true;
    commit(parsed);
  }
  // The flag only covers the update caused by typing. A later change from the parent updates the text.
  void nextTick(() => {
    typing = false;
  });
}

function onInput(event: Event): void {
  typed((event.target as HTMLInputElement).value);
}

function onBlur(): void {
  touched.value = true;
  // A valid text is written the standard way once the user is done typing.
  if (selection.value !== 'multiple' && text.value.trim() !== '' && parse(text.value)) {
    text.value = valueKey.value;
  }
}

function onInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    open.value = true;
  } else if (selection.value === 'multiple' && (event.key === 'Delete' || event.key === 'Backspace')) {
    event.preventDefault();
    commit(empty.value);
  }
}

const invalid = computed(
  () =>
    selection.value !== 'multiple' &&
    touched.value &&
    text.value.trim() !== '' &&
    parse(text.value) === null,
);

function onCalendarChange(next: SelectionValue<M>): void {
  commit(next as Selection);
  const closes = props.closeOnSelect ?? selection.value !== 'multiple';
  if (closes && !isEmptySelection(next as Selection)) close(true);
}

function clear(): void {
  commit(empty.value);
  inputRef.value?.focus();
}

const samplePlaceholder = computed(() => {
  const sample = convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, props.system);
  const sampleEnd = convertDate({ system: 'gregory', year: 2026, month: 10, day: 21 }, props.system);
  if (selection.value === 'range') return formatDateRange({ start: sample, end: sampleEnd }, props.locale);
  return selection.value === 'multiple' ? '' : formatDate(sample, props.locale);
});
</script>

<template>
  <div ref="wrapperRef" class="calendrix-picker">
    <div class="calendrix-picker-field">
      <input
        :id="id"
        ref="inputRef"
        class="calendrix-input"
        type="text"
        dir="ltr"
        autocomplete="off"
        :value="text"
        :readonly="selection === 'multiple'"
        :placeholder="placeholder ?? samplePlaceholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        @input="onInput"
        @blur="onBlur"
        @keydown="onInputKeydown"
      />
      <button
        v-if="!disabled && !isEmptySelection(value)"
        type="button"
        class="calendrix-toggle calendrix-clear"
        :aria-label="text_.clear"
        @click="clear"
      >
        <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
          <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="calendrix-toggle"
        :aria-label="text_.openCalendar"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :aria-controls="open ? dialogId : undefined"
        :disabled="disabled"
        @click="open = !open"
      >
        <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18">
          <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M2.5 7.5h13M6 2v3M12 2v3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <Teleport to="body" :disabled="!portal">
      <div
        v-if="open"
        :id="dialogId"
        ref="popoverRef"
        role="dialog"
        class="calendrix-popover"
        :style="popoverStyle"
        tabindex="-1"
        :aria-label="text_.dialog"
        @keydown="trapTab"
      >
        <Calendar
          :selection="selection"
          :system="system"
          :locale="locale"
          :plugins="plugins"
          :model-value="shown as SelectionValue<M>"
          :min-date="minDate"
          :max-date="maxDate"
          :is-date-unavailable="isDateUnavailable"
          :week-start="weekStart"
          :direction="direction"
          :time-zone="timeZone"
          :now="now"
          :visible-months="visibleMonths ?? (selection === 'range' ? 2 : 1)"
          :allow-unavailable-in-range="allowUnavailableInRange"
          :max-selected="maxSelected"
          @update:model-value="onCalendarChange"
        />
        <div class="calendrix-popover-footer" data-actions-only="">
          <div class="calendrix-actions">
            <button type="button" class="calendrix-action" @click="commit(empty)">
              {{ text_.clear }}
            </button>
            <button type="button" class="calendrix-action calendrix-action-primary" @click="close(true)">
              {{ text_.done }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>