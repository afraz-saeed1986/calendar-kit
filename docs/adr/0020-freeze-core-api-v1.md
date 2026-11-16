# ADR 0020: Freeze the v1 API of the core

- Status: proposed
- Date: 2026-11-16

## Context

`@calendrix/core` was designed to serve any framework (ADR 0001). ADR 0015 and ADR 0019 tested that claim with three adapters: React, Angular (complete: four components, forms, server rendering) and a Vue prototype. All three use the same state, the same options and the same prop getters, and the code they had to repeat (unset options, boolean attributes, moving the focus) now lives in the core. `docs/api.md` and the comments of `types.ts` were brought up to date with the source.

From the moment people build on the core, a change that breaks a caller costs them work. The roadmap (M3) puts the freeze here, before the full Vue adapter, the documentation site and the first release.

## Decision

**The public API of the core is frozen.** Public means everything that `packages/core/src/index.ts` exports, with the behaviour described in `docs/api.md`:

- **Factories:** `createCalendar`, `createTimeField`.
- **Calendar types:** `Calendar`, `CalendarOptions`, `CalendarState`, `CalendarDate`, `CalendarSystem`, `DateRange`, `DayCell`, `Direction`, `WeekStart`, `WeekdayLabel`, `MonthGrid`, `MonthCell`, `YearCell`, `CalendarView`, `Selection`, `SelectionMode`, `SelectionValue`, `SelectionValueMap`, `CalendarLabels`, `ViewLabels`, `KeyEventLike`, `ElementProps`, `AttributeValue`.
- **Plugins and systems:** `CalendarPlugin`, `CalendarImplementation`, `PluginContext`, `registerCalendar`, `getCalendar`, `gregory`.
- **Time:** `TimeField`, `TimeFieldOptions`, `TimeFieldState`, `TimeFieldLabels`, `TimeSegment`, `TimeSegmentType`, `TimeValue`, `DateTimeValue`, `HourCycle`, `toInstant`, `fromInstant`.
- **Dates:** `createDate`, `addDays`, `addMonths`, `addYears`, `compareDates`, `convertDate`, `dayOfWeek`, `isSameDay`.
- **Text and ISO:** `formatDate`, `parseDate`, `datePatternOf`, `DatePattern`, `DateField`, `TextDateOptions`, `formatDateRange`, `parseDateRange`, `formatTime`, `parseTime`, `formatDateTime`, `parseDateTime`, `TextTimeOptions`, `formatISODate`, `parseISODate`, `formatISOTime`, `parseISOTime`, `normalizeDigits`.
- **Pickers:** `pickerLabelsFor`, `PickerLabels`, `PickerKind`, `formatSelection`, `datesSelectedText`, `isEmptySelection`, `toSystem`.
- **Adapters:** `normalizeAttributes`.

**The behaviour that is part of the freeze**, because adapters depend on it:

1. `getState()` returns the same object until something changes.
2. `now`, `timeZone`, `defaultValue` and `focusedDate` are read when the core is created.
3. An option set to `undefined` means "not set", also in `setOptions` (ADR 0019).
4. `value` makes the core controlled when it is not `undefined` (`null` and `[]` mean "nothing selected").
5. The value is in the calendar system on the screen; inputs of any system are converted.
6. Prop getters return `{ attrs, handlers }` with DOM attribute and event names, and the rule for boolean attributes of `ElementProps` (ADR 0006, ADR 0019).
7. `handleKeyDown` returns `true`, after `preventDefault()`, for a key it handled (ADR 0006).
8. `focusRequest` grows by one when the DOM focus should move, and the first value is only remembered (ADR 0019).

**What changes the rules after the freeze**

Allowed without a new ADR (they cannot break a caller):

- a new optional option, a new export, a new field in a state object or in `DayCell`;
- texts for a new locale;
- a fix where the old behaviour contradicted `docs/api.md`.

Needs a new ADR that supersedes this one:

- removing or renaming anything public;
- changing a default value (for example the default locale);
- changing a type so that code that compiled stops compiling (an optional field becomes required, accepted values are narrowed);
- changing the meaning of a state field, or the attributes and events of a prop getter (adapters, styles and tests depend on them).

## Not frozen

- The texts of the built-in labels, including the `aria-label` texts, which may be corrected or improved.
- The output of `format*` functions where it comes from `Intl` and the ICU data of the runtime.
- How much typed text `parse*` accepts: it may accept more forms, never fewer.
- Everything that `index.ts` does not export (internal modules and helpers).
- The adapters (`@calendrix/react`, `@calendrix/angular`, the Vue adapter): their components and their inputs follow the core, and each gets its own decision when it is complete (M4).

## Already planned as additions

These do not break the freeze: a `disabled` option (so that `Calendar` and `TimeField` can be form controls in Angular), a state machine for typed text (finding 12 of ADR 0015), and a range in `DateTimePicker`.

## Alternatives

**Freeze after the full Vue adapter.** One more adapter might find one more problem. But three adapters already agree, and a problem found later is handled by a new ADR that supersedes this one: it is slower than a decision made now, not impossible.

**No freeze before the release.** The release is the date after which a change breaks real users; a freeze that comes with it leaves no room to check the surface first.

## Done when

- `docs/api.md` matches `types.ts` (done).
- The exports of `index.ts` were reviewed: every type that a public signature uses can be imported (see the check below).
- The tests of the core and of the three adapters pass.
- The status of this ADR is changed to `accepted`.