<script setup lang="ts">
import {
  convertDate,
  formatDateTime,
  parseDateTime,
  pickerLabelsFor,
  registerCalendar,
  type CalendarDate,
  type CalendarOptions,
  type CalendarSystem,
  type DateTimeValue,
  type HourCycle,
  type PickerLabels,
  type TimeValue,
} from '@calendrix/core';
import { computed, nextTick, ref, shallowRef, watch } from 'vue';
import Calendar from './Calendar.vue';
import TimeField from './TimeField.vue';
import { usePickerPopover } from './use-picker-popover';

/**
 * A text input and a popover with a calendar and a time field. The user can type a date and a
 * time or pick them; the value is the same `{ date, time }` the core uses (no time zone: see
 * `toInstant`). It has no styles of its own, see `@calendrix/vue/styles.css`. `modelValue` is the
 * picked date and time; `v-model` makes the picker controlled (`null` means "controlled, empty").
 */
const props = withDefaults(
  defineProps<{
    modelValue?: DateTimeValue | null;
    defaultValue?: DateTimeValue | null;
    system?: CalendarSystem;
    locale?: string;
    /** 12 or 24. Default: the locale's own habit. */
    hourCycle?: HourCycle;
    showSeconds?: boolean;
    hourStep?: number;
    minuteStep?: number;
    secondStep?: number;
    /** Times outside this range are rejected. A picked date starts at `minTime`. */
    minTime?: TimeValue;
    maxTime?: TimeValue;
    minDate?: CalendarDate;
    maxDate?: CalendarDate;
    weekStart?: CalendarOptions['weekStart'];
    direction?: CalendarOptions['direction'];
    /** How many months the calendar shows: 1 (default), 2 or 3. */
    visibleMonths?: number;
    isDateUnavailable?: (date: CalendarDate) => boolean;
    plugins?: CalendarOptions['plugins'];
    timeZone?: string;
    now?: () => Date;
    labels?: Partial<PickerLabels>;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    /**
     * Render the popover in `document.body` (default). Pass `false` to render it next to the
     * input instead. The `data-theme` of an ancestor does not reach a portaled popover.
     */
    portal?: boolean;
  }>(),
  // A Vue boolean prop that is not passed becomes `false`; "not passed" must stay `undefined`.
  { system: 'gregory', locale: 'en-US', portal: true, showSeconds: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [value: DateTimeValue | null] }>();

const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

// Typing a date in a calendar from a plugin works before the popover has ever been opened.
function registerPlugins(plugins: CalendarOptions['plugins']): void {
  for (const plugin of plugins ?? []) {
    for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
  }
}
registerPlugins(props.plugins);
watch(() => props.plugins, registerPlugins);

const internalValue = shallowRef<DateTimeValue | null>(props.defaultValue ?? null);
const isControlled = computed(() => props.modelValue !== undefined);
const value = computed(() => (isControlled.value ? props.modelValue : internalValue.value) ?? null);
/** A time chosen before any date. It becomes part of the value when a date is picked. */
const draftTime = shallowRef<TimeValue | null>(null);

const touched = ref(false);

const { open, close, inputRef, wrapperRef, popoverRef, dialogId, popoverStyle, trapTab } =
  usePickerPopover({ portal: () => props.portal });
const text_ = computed(() => pickerLabelsFor(props.locale, props.labels));

const format = (next: DateTimeValue) =>
  formatDateTime(next, {
    locale: props.locale,
    hourCycle: props.hourCycle,
    seconds: props.showSeconds,
  });

/** The value in the calendar system on screen. */
const shown = computed<DateTimeValue | null>(() =>
  value.value
    ? { date: convertDate(value.value.date, props.system), time: value.value.time }
    : null,
);
const valueKey = computed(() => (shown.value ? format(shown.value) : ''));

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

function commit(next: DateTimeValue | null): void {
  if (!isControlled.value) internalValue.value = next;
  emit('update:modelValue', next);
}

const parse = (next: string) => parseDateTime(next, { locale: props.locale, system: props.system });

function onInput(event: Event): void {
  const next = (event.target as HTMLInputElement).value;
  text.value = next;
  if (next.trim() === '') {
    if (value.value !== null) {
      typing = true;
      commit(null);
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

function onBlur(): void {
  touched.value = true;
  // A valid text is written the standard way once the user is done typing.
  if (text.value.trim() !== '' && parse(text.value)) text.value = valueKey.value;
}

function onInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    open.value = true;
  }
}

const invalid = computed(
  () => touched.value && text.value.trim() !== '' && parse(text.value) === null,
);

function pickDate(date: CalendarDate | null): void {
  if (!date) {
    commit(null);
    return;
  }
  commit({ date, time: shown.value?.time ?? draftTime.value ?? props.minTime ?? MIDNIGHT });
}

function pickTime(time: TimeValue | null): void {
  if (shown.value) {
    // Clearing the time of a picked date puts it back to the start of the day.
    commit({ date: shown.value.date, time: time ?? props.minTime ?? MIDNIGHT });
  } else {
    draftTime.value = time;
  }
}

function clear(): void {
  draftTime.value = null;
  commit(null);
}

function clearAndFocus(): void {
  clear();
  inputRef.value?.focus();
}

const samplePlaceholder = computed(() =>
  format({
    date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, props.system),
    time: { hour: 9, minute: 30, second: 0 },
  }),
);
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
        :placeholder="placeholder ?? samplePlaceholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        @input="onInput"
        @blur="onBlur"
        @keydown="onInputKeydown"
      />
      <button
        v-if="!disabled && value !== null"
        type="button"
        class="calendrix-toggle calendrix-clear"
        :aria-label="text_.clear"
        @click="clearAndFocus"
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
          :system="system"
          :locale="locale"
          :plugins="plugins"
          :model-value="shown?.date ?? null"
          :min-date="minDate"
          :max-date="maxDate"
          :is-date-unavailable="isDateUnavailable"
          :week-start="weekStart"
          :direction="direction"
          :visible-months="visibleMonths"
          :time-zone="timeZone"
          :now="now"
          @update:model-value="pickDate"
        />
        <div class="calendrix-popover-footer">
          <TimeField
            :locale="locale"
            :hour-cycle="hourCycle"
            :show-seconds="showSeconds"
            :hour-step="hourStep"
            :minute-step="minuteStep"
            :second-step="secondStep"
            :min-time="minTime"
            :max-time="maxTime"
            :model-value="shown ? shown.time : draftTime"
            @update:model-value="pickTime"
          />
          <div class="calendrix-actions">
            <button type="button" class="calendrix-action" @click="clear">{{ text_.clear }}</button>
            <button type="button" class="calendrix-action calendrix-action-primary" @click="close(true)">
              {{ text_.done }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>