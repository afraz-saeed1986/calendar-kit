# ADR 0014: DatePicker for single, range and multiple selection

- Status: accepted
- Date: 2026-11-09

## Context

`<Calendar/>` supports `selection="range"` and `selection="multiple"` (ADR 0011), but only as an always-visible calendar. Other libraries (for example MUI) also offer the compact form: a text input with an icon that opens the calendar in a popover and shows the selection as text. `<DateTimePicker/>` has this form, but only for one date and a time.

Range and multiple selection with a time are a different problem (a time for each end, or for each day) and stay out of scope: see the deferred items in the roadmap.

## Decision

**One component, `DatePicker<M>`,** with a `selection` prop (`'single'` default, `'range'`, `'multiple'`). The types of `value`, `defaultValue` and `onChange` follow `selection`, as in `Calendar` (`SelectionValue<M>`). It selects dates only: no time field.

Props: the date options of `DateTimePicker` (`system`, `locale`, `plugins`, `minDate`, `maxDate`, `isDateUnavailable`, `timeZone`, `now`, `weekStart`, `direction`, `labels`, `placeholder`, `disabled`, `id`, `className`, `portal`) plus the options of `Calendar` that depend on the mode: `visibleMonths`, `allowUnavailableInRange` and `maxSelected`.

- `visibleMonths` defaults to 2 for `'range'` (so a range can cross a month boundary) and to 1 otherwise.
- `value` and `onChange` use the calendar system on screen, like `Calendar` and `DateTimePicker`. `convertDate` converts them.

**Text in the input.**

- `single`: one date, typed or picked, as in `DateTimePicker` (ADR 0008).
- `range`: `start – end`, with an en dash and spaces, formatted in the locale (`11/18/2026 – 11/25/2026`). The text can be typed and is parsed. The separators accepted when parsing are an en dash or em dash (with or without spaces), a hyphen with spaces around it, and the word `to` (`تا` in Persian, `bis` in German) with spaces around it. A hyphen without spaces is not a separator, because some locales write dates with hyphens. If the end is before the start, the two are swapped, as when picking. A text with only one date is not committed.
- `multiple`: the input is read-only. It shows the dates, sorted and joined with a comma, when there are at most 3; otherwise a count (`5 dates`). The texts for the count are in the labels and are built in for English, Persian and German. Delete and Backspace clear the selection; the popover also has a Clear button, and a clear button in the field (in all modes) is shown while there is a selection.

The date formatting and parsing come from the text functions of ADR 0008. Parsing and formatting a range is added to `@calendrix/core`, because it does not depend on React.

**Popover behavior.**

- It is the same popover as in `DateTimePicker` (ADR 0013): Floating UI positioning, a portal by default, a focus trap, Escape and Done return the focus to the input.
- `single` and `range` close after the selection is complete (the second click of a range) and return the focus to the input. `multiple` stays open until Done, Escape or an outside click.
- The prop `closeOnSelect` (default `true` for `single` and `range`, `false` for `multiple`) overrides this.
- The footer has Clear and Done. There is no time field.

**Shared code.** The popover logic of `DateTimePicker` (positioning, portal, outside click, Escape, focus trap and focus on open) is extracted into an internal module, so both pickers use one implementation. `DateTimePicker` behaves exactly as before; its tests must pass unchanged.

## Consequences

- One new public component and its props type (`DatePicker`, `DatePickerProps`). The core gets `formatDateRange` and `parseDateRange`.
- Typed dates are not checked against `minDate`, `maxDate` and `isDateUnavailable`, as in `DateTimePicker` today. This is a known gap for both pickers, to be handled together.
- Angular and Vue adapters will get the same component later, with the same decisions.