import type { PickerLabels } from '@calendrix/core';

export type DatePickerLabels = Partial<PickerLabels> & {
  /** The text of a long list of days in `multiple` mode. Default: "5 dates" (built in for en, fa, de). */
  datesSelected?: (count: number) => string;
};