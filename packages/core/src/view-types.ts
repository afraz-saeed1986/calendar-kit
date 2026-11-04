/** Which grid a calendar shows: the days of a month, the months of a year, or a page of years. */
export type CalendarView = 'days' | 'months' | 'years';

/** One month in the grid of months. */
export interface MonthCell {
  /** 1-based number of the month in its year. */
  readonly month: number;
  /** Name of the month in the locale: "October", "مهر". */
  readonly label: string;
  /** The month that contains today. */
  readonly isCurrent: boolean;
  /** The month that contains the selected day. */
  readonly isSelected: boolean;
  readonly isFocused: boolean;
  /** Every day of the month is outside `minDate` and `maxDate`. */
  readonly isDisabled: boolean;
}

/** One year in the page of years. */
export interface YearCell {
  readonly year: number;
  /** The year with the numerals of the locale: "2026", "۱۴۰۵". */
  readonly label: string;
  /** The year that contains today. */
  readonly isCurrent: boolean;
  /** The year that contains the selected day. */
  readonly isSelected: boolean;
  readonly isFocused: boolean;
  /** Every day of the year is outside `minDate` and `maxDate`. */
  readonly isDisabled: boolean;
  /** The first and last cell of a page belong to the previous and the next decade. */
  readonly isOutsideDecade: boolean;
}

/** Texts for the buttons and grids of the month and year views. */
export interface ViewLabels {
  previousYear: string;
  nextYear: string;
  previousDecade: string;
  nextDecade: string;
  chooseMonth: string;
  chooseYear: string;
}
