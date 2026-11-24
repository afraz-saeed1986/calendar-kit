import type { ComponentType, ReactNode } from 'react';
import DatePickerExample from './date-picker';
import DatePickerRangeExample from './date-picker-range';
import DateTimePickerExample from './date-time-picker';
import DateTimePickerRangeExample from './date-time-picker-range';
import PersianRtlExample from './persian-rtl';
import TimeFieldExample from './time-field';

/** The examples of the documentation site. Each one is shown alone when the URL hash names it. */
export const examples: Record<string, ComponentType> = {
  'date-picker': DatePickerExample,
  'date-picker-range': DatePickerRangeExample,
  'date-time-picker': DateTimePickerExample,
  'date-time-picker-range': DateTimePickerRangeExample,
  'time-field': TimeFieldExample,
  'persian-rtl': PersianRtlExample,
};

export function ExampleFrame({ children }: { children: ReactNode }) {
  return <div style={{ padding: 16 }}>{children}</div>;
}
