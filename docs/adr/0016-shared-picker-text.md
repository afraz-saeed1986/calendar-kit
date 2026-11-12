# ADR 0016: Shared picker text in the core

- Status: accepted
- Date: 2026-11-12

## Context

`DatePicker` in `@calendrix/react` uses five things that do not depend on React: `formatSelection`, `isEmptySelection`, `toSystem`, `datesSelectedText` (the text of a long list of days) and `pickerLabelsFor` (the texts of the buttons, for en, fa and de). The Angular adapter, and later the Vue adapter, need the same code. Copied three times, the language table would have to be changed in three places. This is also what ADR 0015 asked: what must the core offer so that an adapter has no logic of its own to copy?

A second problem: `pickerLabelsFor` has one set of texts for both pickers, so the button and the dialog of `DatePicker` (which has no time) say "Choose date and time".

## Decision

Move these to `@calendrix/core`, exported from its index with their tests:

- `formatSelection(value, locale, customCount?)`, `isEmptySelection(value)`, `toSystem(value, system)`, `datesSelectedText(locale, count, custom?)`.
- `PickerLabels` and `pickerLabelsFor(locale, overrides?, kind?)`, where `kind` is `'date'` or `'dateTime'` (default `'dateTime'`, the current behaviour). For `'date'` the texts of `openCalendar` and `dialog` are "Choose date" (en), "انتخاب تاریخ" (fa) and "Datum wählen" (de).

`DatePicker` calls `pickerLabelsFor(locale, labels, 'date')`; `DateTimePicker` is unchanged. In `@calendrix/react` the files `date-picker-text.ts` and `messages.ts` are deleted and the components import from the core. `@calendrix/react` keeps exporting `DatePickerLabels`.

Not moved: the popover logic (it works on the DOM and on each framework's lifecycle), and the typing state of the input (`typing` ref), which belongs to each adapter.

## Consequences

- The public API of the core grows by six functions and one type, before the v1 freeze (roadmap M3).
- One language table: a new language is added in one place.
- The input logic of `DatePicker` (typed text, blur, validity) is still written in each adapter. If the Vue prototype shows that it is the same code again, it is a candidate for the core as well (a "text field" state machine), as with the focus request in ADR 0015.
