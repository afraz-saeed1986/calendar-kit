# Roadmap

Order of work: **core + React**, then **quick Angular and Vue prototypes** to validate the API, then API fixes, then full adapters, accessibility and docs, then the finance plugin.

Dates are intentionally omitted; milestones are ordered by dependency, not by calendar.

## M0: Foundation (done)

- [x] Monorepo (pnpm, Turborepo, tsup, Vitest, ESLint, Prettier)
- [x] Core types and `CalendarImplementation` contract
- [x] Gregorian calendar with leap-year and epoch-day tests
- [x] Date helpers: `createDate`, `addDays`, `convertDate`, `compareDates`
- [x] Documentation skeleton and ADRs

## M1: Core state machine (done)

- [x] Persian calendar (`Intl`-backed, verified against known conversions)
- [x] `createCalendar`: visible month, `weeks` grid, locale-aware labels
- [x] Navigation: month, year, today, `goTo`
- [x] `single` selection
- [x] `handleKeyDown` (ARIA grid pattern)
- [x] Prop getters
- [x] Time model: `TimeValue`, `DateTimeValue`, `toInstant` and `fromInstant`, ISO helpers
- [x] `createTimeField`: segments, typing, arrow keys, 12 and 24-hour clock
- [x] Text input: format and parse a date, a time and a date-time in each locale

## M2: React adapter (done)

- [x] `useCalendar` and `useTimeField` hooks with stable options
- [x] `Calendar` and `TimeField` components
- [x] `DateTimePicker`: text input, popover, typed and picked values
- [x] Base stylesheet (CSS variables, dark mode, RTL)
- [x] Month and year views: pick from a grid of months or a page of years ([ADR 0010](adr/0010-month-year-views.md))
- [x] Range and multiple selection in the core and `Calendar` ([ADR 0011](adr/0011-range-and-multiple-selection.md))
- [x] Up to three visible months side by side ([ADR 0012](adr/0012-multiple-visible-months.md))
- [x] Popover: flip and shift near the viewport edge, portal, focus trap ([ADR 0013](adr/0013-popover-positioning-and-focus.md))
- [x] `DatePicker`: input and popover for single, range and multiple selection ([ADR 0014](adr/0014-date-picker.md))
- [x] Demo app (`apps/demo`)

## M3: API validation

- [x] Angular adapter (four components, forms, server rendering checked) and a Vue prototype ([ADR 0015](adr/0015-angular-adapter.md))
- [x] Code that every adapter needs moved into the core ([ADR 0019](adr/0019-core-helpers-for-adapters.md))
- [x] Resolve the open decisions below
- [x] Check `api.md` and the public exports of `index.ts` against `types.ts`
- [x] **Freeze the v1 API** ([ADR 0020](adr/0020-freeze-core-api-v1.md))

## M4: Full adapters, range selection, a11y

- [x] Angular adapter complete (four components, `ControlValueAccessor` on the pickers, shared styles, server rendering)
- [x] Vue adapter complete (four components, pickers, popover, shared styles, server rendering) ([ADR 0021](adr/0021-vue-adapter.md))
- [ ] Range in `DateTimePicker` (a start and an end, each with a time)
- [ ] Time field on touch devices (hidden input for the on-screen keyboard)
- [ ] Screen reader testing and automated a11y checks
- [ ] RTL and Persian numerals verified in all adapters
- [ ] Typed dates are checked against `minDate`, `maxDate` and unavailable days in the pickers
- [ ] An invalid typed text can be cleared with the ✕ button
- [ ] `data-theme` of a parent reaches the popover that is moved to `<body>`
- [ ] A `disabled` option in the core, so that `Calendar` and `TimeField` can be form controls in Angular

## M5: Documentation and first release

- [ ] Documentation site with live demos for all three frameworks
- [ ] Bundle size and performance numbers in the README
- [ ] Peer dependency of the adapters on `@calendrix/core`: from the exact `0.0.0` to a range (`^x.y.z`)
- [ ] Publish `0.1.0`

## M6: Finance plugin

- [ ] Market calendar plugin (weekend rules, holidays, sessions)
- [ ] Next business day and T+N settlement helpers
- [ ] Injectable holiday data sets (Iran, Germany, US)

## Open decisions

All settled while building the adapters. Details in [api.md](api.md), section 7.

1. Public date representation: a triple publicly, epoch day internally.
2. Prop getters: single object vs separate `attrs` and `handlers`. Settled in [ADR 0006](adr/0006-selection-keyboard-props.md).
3. Time zone handling for "today" (injectable clock). Settled for wall-clock values in [ADR 0007](adr/0007-time-model.md).
4. Temporal API: not used; `Intl` behind `CalendarImplementation`.
5. Multi-month views in `state`. Settled in [ADR 0012](adr/0012-multiple-visible-months.md).
