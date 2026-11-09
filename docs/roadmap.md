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
- [x] Demo app (`apps/demo`)

## M3: API validation

- [ ] Minimal Angular prototype (signals) and Vue prototype (composable)
- [ ] Resolve the open decisions below and **freeze the v1 API**

## M4: Full adapters, range selection, a11y

- [ ] Angular and Vue adapters complete
- [ ] Range in `DateTimePicker` (a start and an end, each with a time)
- [ ] Time field on touch devices (hidden input for the on-screen keyboard)
- [ ] Screen reader testing and automated a11y checks
- [ ] RTL and Persian numerals verified in all adapters

## M5: Documentation and first release

- [ ] Documentation site with live demos for all three frameworks
- [ ] Bundle size and performance numbers in the README
- [ ] Publish `0.1.0`

## M6: Finance plugin

- [ ] Market calendar plugin (weekend rules, holidays, sessions)
- [ ] Next business day and T+N settlement helpers
- [ ] Injectable holiday data sets (Iran, Germany, US)

## Open decisions

Tracked here until an ADR settles them. Details in [api.md](api.md), section 7.

1. Public date representation: triple vs epoch day (current direction: triple publicly, epoch day internally).
2. Prop getters: single object vs separate `attrs` and `handlers`. Settled in [ADR 0006](adr/0006-selection-keyboard-props.md).
3. Time zone handling for "today" (injectable clock). Settled for wall-clock values in [ADR 0007](adr/0007-time-model.md).
4. Temporal API migration path.
5. Multi-month views in `state`. Settled in [ADR 0012](adr/0012-multiple-visible-months.md).
