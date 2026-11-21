# ADR 0023: A range in `DateTimePicker`

Status: accepted

## Context

`DatePicker` picks one day, a range or many days. `DateTimePicker` picks one date with one time.
A booking, a report period or a log filter needs a start and an end that each have a time. The
core has `formatDateRange` and `parseDateRange` for dates only, and `DateTimeValue` for one point.
The roadmap lists "Range in `DateTimePicker`" (M4).

## Decision

1. **One component, a `selection` prop.** `DateTimePicker` gets `selection?: 'single' | 'range'`
   (default `'single'`), like `DatePicker`. A separate `DateTimeRangePicker` would repeat the
   popover, the text field and the forms code three times. `multiple` is not supported.
2. **The value.** In range mode the value is `{ start: DateTimeValue; end: DateTimeValue } | null`.
   The core exports the type `DateTimeRange` and a type `DateTimePickerValue<M>` that follows
   `selection` (`DateTimeValue | null` for `'single'`, `DateTimeRange | null` for `'range'`). Each
   end is a complete `DateTimeValue`, so `toInstant` works on each end as before.
3. **Text.** The core gets `formatDateTimeRange(range, options)` and `parseDateTimeRange(text,
   options)`: two `formatDateTime` texts joined by the separator that `formatDateRange` uses, and
   the reverse. Both are additions (ADR 0020). A text that cannot be parsed is not a value.
4. **The popover.** The calendar in range mode (`visibleMonths` default 2), and under it two time
   fields with the labels "Start time" and "End time". The labels are new keys of `PickerLabels`
   (`startTime`, `endTime`), built in for en, fa and de. The time of the start and the time of the
   end are always on screen, so there is no "which end is active" state.
5. **When the value is reported.** As in `DatePicker`, the value is `null` until the range is
   complete: the first day only starts it. The times can be changed before that; they wait as a
   draft, and are part of the value when the second day is picked. A time that is not set is
   `minTime`, or midnight when there is no `minTime`, for both ends.
6. **The order rule: the end sticks to the start.** If start and end are on the same day and the
   end would be before the start, the end time becomes the start time. This holds when the user
   edits the end time to be earlier, when the user edits the start time to be later than the end,
   and when a range is completed that way. The value is always in order. The calendar already puts
   the earlier day first when the second click is before the first, and the times stay with their
   role (the start time stays the start time).
7. **Limits.** `minDate`, `maxDate` and `isDateUnavailable` go to the calendar; `minTime` and
   `maxTime` go to both time fields. Typed text is not checked against them (the same open item
   as for the other pickers in the roadmap).
8. **Closing.** `closeOnSelect` does not apply: the popover stays open after the range is
   complete because the times may still change. Done, Escape and a click outside close it.
9. **Adapters.** React, Vue and Angular get the same `selection` prop, the same value and the
   same labels. In Angular the `ControlValueAccessor` carries `DateTimeRange | null`.

10. **The order rule is in the core.** `stickEndToStart(range)` returns the range with the end
    set to the start when the end is earlier, and the same object when nothing changes, so the
    three adapters do not each write the rule. A typed text whose end is earlier than its start is
    swapped by `parseDateTimeRange`, as `parseDateRange` does for dates.

## Tests

- Core: `formatDateTimeRange` and `parseDateTimeRange` round-trip in en-US, de-DE and fa-IR with
  the Persian calendar; a text with one end, or an unknown format, is `null`; the new labels.
- Per adapter: picking two days reports one range with the draft times; changing a time of a
  complete range reports a new range; the order rule in its three cases; a typed range is
  understood; clear empties both ends and the drafts; `selection="single"` behaves as before.

## Done when

The core tests and the tests of the three adapters pass, `docs/api.md` describes the value and the
two functions, the demos show a range with times, and the roadmap item is checked.

## Alternatives

- **A separate `DateTimeRangePicker`.** Simpler types, but three copies of the picker logic that
  would drift apart.
- **One time field for the active end.** Fewer controls, but the user has to find out which end
  is active, and it is harder for a screen reader.
- **Keep an invalid order and only warn.** The application would have to check every value; the
  core promises an ordered range for dates, so times follow the same rule.
- **`startTime` and `endTime` as separate props.** Does not match `DateTimeValue` or `toInstant`.

## Stages

1. Core: types, `formatDateTimeRange`, `parseDateTimeRange`, labels, tests.
2. React. 3. Vue. 4. Angular (with forms).
5. `docs/api.md`, the three demos, the roadmap.


## Result

Done in all four layers, in this order: core, React, Vue, Angular.

- **Core:** `formatDateTimeRange`, `parseDateTimeRange`, `stickEndToStart`, the types `DateTimeMode`, `DateTimePickerValue` and `DateTimeRange`, and the labels `startTime` and `endTime` (en, fa, de). 11 new tests.
- **React:** `DateTimePicker` is generic in `selection`. 11 new tests; the tests of `single` did not change.
- **Vue:** the same logic in `DateTimePicker.vue`. 12 new tests (73 in the package).
- **Angular:** `CalendrixDateTimePicker<M>` with `selection`, and the `ControlValueAccessor` carries `DateTimeRange | null`. 12 new tests (66 in the library).
- **Docs and demos:** `docs/api.md`, the roadmap, and a range with times in the React and Vue demos.