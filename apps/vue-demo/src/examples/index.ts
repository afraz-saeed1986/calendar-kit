import type { Component } from 'vue';
import DatePickerExample from './DatePickerExample.vue';
import DatePickerRangeExample from './DatePickerRangeExample.vue';
import DateTimePickerExample from './DateTimePickerExample.vue';
import DateTimePickerRangeExample from './DateTimePickerRangeExample.vue';
import PersianRtlExample from './PersianRtlExample.vue';
import TimeFieldExample from './TimeFieldExample.vue';

/** The examples of the documentation site. Each one is shown alone when the URL hash names it. */
export const examples: Record<string, Component> = {
  'date-picker': DatePickerExample,
  'date-picker-range': DatePickerRangeExample,
  'date-time-picker': DateTimePickerExample,
  'date-time-picker-range': DateTimePickerRangeExample,
  'time-field': TimeFieldExample,
  'persian-rtl': PersianRtlExample,
};
