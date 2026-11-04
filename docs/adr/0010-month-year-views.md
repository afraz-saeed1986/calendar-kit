# ADR 0010: Month and year views

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

Moving month by month is slow when the date is far away, for example a birth date. Users expect to click the month or the year in the header and pick from a list, as in native date pickers.

## Decision

**The view is state of the calendar store.** `CalendarState.view` is `'days'`, `'months'` or `'years'`, changed with `setView`, the month and year buttons, or by choosing a cell. It is not an option: it resets with the component and adapters need nothing to keep it in sync.

**The header has two buttons.** One shows the name of the month and one shows the year. Each opens its grid and closes it again. In the years view the month button is hidden and the year button shows the decade ("2020 – 2029"). The accessible name of a button contains its visible text ("October, Choose month"), and `aria-expanded` tells whether its grid is open.

**The grids reuse the ARIA grid pattern.** Months and years are `gridcell`s in rows of three, with the same roving `tabindex` as days. The core provides `getMonthProps(month)` and `getYearProps(year)` like `getDayProps`, and `state.months` and `state.years` hold the cells.

**Years are paged by decade.** A page has 12 cells: the decade of the visible year plus one year on each side, which are marked `isOutsideDecade`. The previous and next buttons move by a month, a year or ten years, depending on the view, and their labels change with it.

**Choosing keeps the calendar consistent.**

- Choosing a month or a year goes back to the days and moves the focus only. It does not change the selected value.
- The day is clamped when the target month is shorter (31 January to February gives 28 or 29).
- Months and years with no day between `minDate` and `maxDate` are disabled and cannot be chosen.
- The number of months comes from the calendar implementation, so a calendar with 13 months works.

**Keyboard.** Arrows move by one cell and by one row of three, reversed left and right in right-to-left languages. PageUp and PageDown move by a year (ten years in the years view). Home and End go to the first and last cell. Enter and Space choose. Escape goes back to the days.

**Adapter behavior.** `<Calendar />` moves the real focus into the grid that opens and back to the focused day when the view closes. Escape is handled by the calendar from anywhere inside it, including its buttons. `<DateTimePicker />` listens to Escape on the document while the popover is open and ignores a key that the calendar already used. The first Escape leaves the month or year view, the second closes the popover.

## Consequences

- (+) Far dates take two clicks instead of dozens, with the keyboard and with a screen reader.
- (+) All logic is in the core, so the Angular and Vue adapters only render the cells.
- (+) Persian, other calendars and right-to-left work with no special cases.
- (−) The view cannot be controlled from outside. If a real need appears, `view` and `onViewChange` can be added as options without breaking anything.
- (−) A year cannot be typed in the years view. Typing a full date in the input covers that case.
- (−) The grids have no transition animation.
