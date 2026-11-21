# ADR 0025: A typed date must be one the user could pick

Status: accepted

## Context

In `DatePicker` and `DateTimePicker` the user can type a date. The text is parsed, and when the
format is right it becomes the value, even if the date is outside `minDate`..`maxDate`, is marked
by `isDateUnavailable` or by a plugin, or (in `DateTimePicker`) has a time outside
`minTime`..`maxTime`. The calendar does not let the user pick such a date, so the two ways to
enter a value disagree, and the application can receive a value that it forbade.

## Decision

1. **A text that is not allowed is not a value.** It is treated like a text that cannot be parsed
   (ADR 0023, item 3): `onChange` is not called, the previous value stays, and after the blur the
   input gets `aria-invalid`. The other choices were to clamp the date to the nearest allowed one,
   which changes what the user typed without saying so, and to report the date and mark it
   invalid, which gives the application a date it forbade.
2. **Three pure functions in the core**, in a new `selectable.ts`, so that the three adapters
   share one rule. They are additions (ADR 0020):
   - `isDateSelectable(date, options)`;
   - `isRangeSelectable(range, options)`;
   - `isTimeSelectable(time, options)`.

   `options` is `SelectableOptions`: `minDate`, `maxDate`, `isDateUnavailable`, `plugins`,
   `locale` and `system` (the context of the plugins; default: the system of the date and
   `en-US`), `allowUnavailableInRange`, `minTime` and `maxTime`.
3. **The rule for a day is the rule of the calendar.** A day is selectable when it is inside
   `minDate`..`maxDate` (compared as epoch days, so a date in another calendar system compares
   right) and neither `isDateUnavailable` nor a plugin (`isDateUnavailable(date, { system,
   locale })`) marks it. A plugin does not need a visible month: its context holds only the system
   and the locale.
4. **A range** needs both ends to be selectable. The days between them may be unavailable, unless
   `allowUnavailableInRange` is `false`, as in `selectDay` of the calendar.
5. **A time** is selectable when it is inside `minTime`..`maxTime`, both included, as in
   `TimeField`. In `DateTimePicker` the limits apply to the time of every day, as they do now when
   the user picks, and to both ends of a range.
6. **Where it is applied.** In the `parse` function of each picker, after the text is parsed, so
   one place covers the typed value, the `aria-invalid` mark and the rewrite of the text on blur.
   Values that the application gives (`value`, `defaultValue`, a form) are not checked: the
   application is responsible for them, as for `Calendar`.

## Not decided here

- A visible "x" or a message for a text that is not valid (roadmap), and the reason (outside the
  bounds, unavailable, time outside the limits).

## Plan

1. Core: `selectable.ts`, the exports, tests.
2. React, Vue, Angular, one by one, with tests.
3. `docs/api.md`, the roadmap, the Result section.