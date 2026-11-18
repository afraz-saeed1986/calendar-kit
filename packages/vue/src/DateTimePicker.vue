<script setup lang="ts" generic="M extends DateTimeMode = 'single'">
import {
  convertDate,
  formatDateTime,
  formatDateTimeRange,
  parseDateTime,
  parseDateTimeRange,
  pickerLabelsFor,
  registerCalendar,
  stickEndToStart,
  type CalendarDate,
  type CalendarOptions,
  type CalendarSystem,
  type DateRange,
  type DateTimeMode,
  type DateTimePickerValue,
  type DateTimeRange,
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
 * `toInstant`). With `selection="range"` the value is `{ start, end }`, each with a date and a
 * time, and the popover has two time fields (ADR 0023). It has no styles of its own, see
 * `@calendrix/vue/styles.css`. `modelValue` is the picked value; `v-model` makes the picker
 * controlled (`null` means "controlled, empty").
 */
const props = withDefaults(
  defineProps<{
    /** One date and time (default), or a range with a start and an end, each with a time. */
    selection?: M;
    modelValue?: DateTimePickerValue<M>;
    defaultValue?: DateTimePickerValue<M>;
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
    /** How many months the calendar shows: 1 (default; 2 for `range`), 2 or 3. */
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

const emit = defineEmits<{ 'update:modelValue': [value: DateTimePickerValue<M>] }>();

const MIDNIGHT: TimeValue = { hour: 0, minute: 0, second: 0 };

/** The two shapes the picker works with inside; the public type follows `selection`. */
type Value = DateTimeValue | DateTimeRange | null;
const isRange = (value: Value): value is DateTimeRange => value !== null && 'start' in value;

// Typing a date in a calendar from a plugin works before the popover has ever been opened.
function registerPlugins(plugins: CalendarOptions['plugins']): void {
  for (const plugin of plugins ?? []) {
    for (const calendar of plugin.calendars ?? []) registerCalendar(calendar);
  }
}
registerPlugins(props.plugins);
watch(() => props.plugins, registerPlugins);

const isRangeMode = computed(() => props.selection === 'range');

const internalValue = shallowRef<Value>((props.defaultValue ?? null) as Value);
const isControlled = computed(() => props.modelValue !== undefined);
const value = computed<Value>(
  () => ((isControlled.value ? props.modelValue : internalValue.value) ?? null) as Value,
);
/**
 * A time chosen before any date. It becomes part of the value when a date is picked. In `single`
 * mode `draftStart` is the only one; in `range` mode there is one for each end.
 */
const draftStart = shallowRef<TimeValue | null>(null);
const draftEnd = shallowRef<TimeValue | null>(null);

const touched = ref(false);

const { open, close, inputRef, wrapperRef, popoverRef, dialogId, popoverStyle, trapTab } =
  usePickerPopover({ portal: () => props.portal });
const texts = computed(() => pickerLabelsFor(props.locale, props.labels));
const startLabels = computed(() => ({ time: texts.value.startTime }));
const endLabels = computed(() => ({ time: texts.value.endTime }));

const format = (next: Value): string => {
  if (next === null) return '';
  const options = { locale: props.locale, hourCycle: props.hourCycle, seconds: props.showSeconds };
  return isRange(next) ? formatDateTimeRange(next, options) : formatDateTime(next, options);
};
const parse = (next: string): Value =>
  isRangeMode.value
    ? parseDateTimeRange(next, { locale: props.locale, system: props.system })
    : parseDateTime(next, { locale: props.locale, system: props.system });

/** The value in the calendar system on screen. */
const inSystem = (point: DateTimeValue): DateTimeValue => ({
  date: convertDate(point.date, props.system),
  time: point.time,
});
const shown = computed<Value>(() => {
  const current = value.value;
  if (current === null) return null;
  return isRange(current)
    ? { start: inSystem(current.start), end: inSystem(current.end) }
    : inSystem(current);
});
const shownPoint = computed(() => (shown.value !== null && !isRange(shown.value) ? shown.value : null));
const shownRange = computed(() => (shown.value !== null && isRange(shown.value) ? shown.value : null));
/** The dates of a complete range, for the calendar. */
const calendarRange = computed<DateRange | null>(() =>
  shownRange.value ? { start: shownRange.value.start.date, end: shownRange.value.end.date } : null,
);
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

function commit(next: Value): void {
  if (!isControlled.value) internalValue.value = next;
  emit('update:modelValue', next as DateTimePickerValue<M>);
}

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

const defaultTime = computed(() => props.minTime ?? MIDNIGHT);

function pickDate(date: CalendarDate | null): void {
  if (!date) {
    commit(null);
    return;
  }
  commit({ date, time: shownPoint.value?.time ?? draftStart.value ?? defaultTime.value });
}

/** The second day of a range: the times are the ones already chosen, or the default. */
function pickRange(range: DateRange | null): void {
  if (!range) {
    commit(null);
    return;
  }
  commit(
    stickEndToStart({
      start: {
        date: range.start,
        time: shownRange.value?.start.time ?? draftStart.value ?? defaultTime.value,
      },
      end: {
        date: range.end,
        time: shownRange.value?.end.time ?? draftEnd.value ?? defaultTime.value,
      },
    }),
  );
}

function pickTime(which: 'start' | 'end', time: TimeValue | null): void {
  // Clearing the time of a picked date puts it back to the start of the day.
  const next = time ?? defaultTime.value;
  const range = shownRange.value;
  const point = shownPoint.value;
  if (range) {
    commit(
      stickEndToStart({
        start: which === 'start' ? { ...range.start, time: next } : range.start,
        end: which === 'end' ? { ...range.end, time: next } : range.end,
      }),
    );
  } else if (point) {
    commit({ date: point.date, time: next });
  } else if (which === 'start') {
    draftStart.value = time;
  } else {
    draftEnd.value = time;
  }
}

function clear(): void {
  draftStart.value = null;
  draftEnd.value = null;
  commit(null);
}

function clearAndFocus(): void {
  clear();
  inputRef.value?.focus();
}

const samplePlaceholder = computed(() => {
  const sampleStart: DateTimeValue = {
    date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 14 }, props.system),
    time: { hour: 9, minute: 30, second: 0 },
  };
  const sampleEnd: DateTimeValue = {
    date: convertDate({ system: 'gregory', year: 2026, month: 10, day: 21 }, props.system),
    time: { hour: 17, minute: 0, second: 0 },
  };
  return format(isRangeMode.value ? { start: sampleStart, end: sampleEnd } : sampleStart);
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
        :aria-label="texts.clear"
        @click="clearAndFocus"
      >
        <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14">
          <path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="calendrix-toggle"
        :aria-label="texts.openCalendar"
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
        :aria-label="texts.dialog"
        @keydown="trapTab"
      >
        <Calendar
          v-if="isRangeMode"
          selection="range"
          :system="system"
          :locale="locale"
          :plugins="plugins"
          :model-value="calendarRange"
          :min-date="minDate"
          :max-date="maxDate"
          :is-date-unavailable="isDateUnavailable"
          :week-start="weekStart"
          :direction="direction"
          :visible-months="visibleMonths ?? 2"
          :time-zone="timeZone"
          :now="now"
          @update:model-value="pickRange"
        />
        <Calendar
          v-else
          :system="system"
          :locale="locale"
          :plugins="plugins"
          :model-value="shownPoint?.date ?? null"
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
          <div v-if="isRangeMode" class="calendrix-time-range">
            <div class="calendrix-time-row">
              <span class="calendrix-time-label" aria-hidden="true">{{ texts.startTime }}</span>
              <TimeField
                :locale="locale"
                :hour-cycle="hourCycle"
                :show-seconds="showSeconds"
                :hour-step="hourStep"
                :minute-step="minuteStep"
                :second-step="secondStep"
                :min-time="minTime"
                :max-time="maxTime"
                :labels="startLabels"
                :model-value="shownRange ? shownRange.start.time : draftStart"
                @update:model-value="pickTime('start', $event)"
              />
            </div>
            <div class="calendrix-time-row">
              <span class="calendrix-time-label" aria-hidden="true">{{ texts.endTime }}</span>
              <TimeField
                :locale="locale"
                :hour-cycle="hourCycle"
                :show-seconds="showSeconds"
                :hour-step="hourStep"
                :minute-step="minuteStep"
                :second-step="secondStep"
                :min-time="minTime"
                :max-time="maxTime"
                :labels="endLabels"
                :model-value="shownRange ? shownRange.end.time : draftEnd"
                @update:model-value="pickTime('end', $event)"
              />
            </div>
          </div>
          <TimeField
            v-else
            :locale="locale"
            :hour-cycle="hourCycle"
            :show-seconds="showSeconds"
            :hour-step="hourStep"
            :minute-step="minuteStep"
            :second-step="secondStep"
            :min-time="minTime"
            :max-time="maxTime"
            :model-value="shownPoint ? shownPoint.time : draftStart"
            @update:model-value="pickTime('start', $event)"
          />
          <div class="calendrix-actions">
            <button type="button" class="calendrix-action" @click="clear">{{ texts.clear }}</button>
            <button type="button" class="calendrix-action calendrix-action-primary" @click="close(true)">
              {{ texts.done }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>