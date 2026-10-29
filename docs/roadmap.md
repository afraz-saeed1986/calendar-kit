# Roadmap

Order of work: **core + React**, then **quick Angular and Vue prototypes** to validate the API, then API fixes, then full adapters, accessibility and docs, then the finance plugin.

Dates are intentionally omitted; milestones are ordered by dependency, not by calendar.

## M0: Foundation (done)

- [x] Monorepo (pnpm, Turborepo, tsup, Vitest, ESLint, Prettier)
- [x] Core types and `CalendarImplementation` contract
- [x] Gregorian calendar with leap-year and epoch-day tests
- [x] Date helpers: `createDate`, `addDays`, `convertDate`, `compareDates`
- [x] Documentation skeleton and ADRs

## M1: Core state machine

- [x] Persian calendar (`Intl`-backed, verified against known conversions)
- [x] `createCalendar`: visible month, `weeks` grid, locale-aware labels
- [x] Navigation: month, year, today, `goTo`
- [x] `single` selection
- [x] `handleKeyDown` (ARIA grid pattern)
- [x] Prop getters

## M2: React adapter

- [ ] `useCalendar` hook
- [ ] Default unstyled components and a base stylesheet
- [ ] Demo page

## M3: API validation

- [ ] Minimal Angular prototype (signals) and Vue prototype (composable)
- [ ] Resolve the open decisions below and **freeze the v1 API**

## M4: Full adapters, range selection, a11y

- [ ] Angular and Vue adapters complete
- [ ] `range` and `multiple` selection
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
2. Prop getters: single object vs separate `attrs` and `handlers`.
3. Time zone handling for "today" (injectable clock).
4. Temporal API migration path.
5. Multi-month views in `state`.
