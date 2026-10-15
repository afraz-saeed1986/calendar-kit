# ADR 0003: Plugins for calendars and domain rules

- **Status:** Accepted (interface may evolve before v1)
- **Date:** 2026-10-14

## Context

The core should stay small. Persian and Islamic calendars, holiday sets and financial market rules are valuable but not needed by every user, and some (holiday data) change frequently.

## Decision

Extend the core through plugins with three optional hooks:

- `calendars`: register new `CalendarImplementation`s.
- `decorateDay`: attach metadata to a day (e.g. `{ holiday: 'Nowruz' }`), exposed as `DayCell.meta`.
- `isDateUnavailable`: mark a day as not selectable (e.g. market closed).

Holiday and market data is **injected** into plugins rather than bundled, so data can be updated independently of code.

## Consequences

- (+) The core stays dependency-free and tree-shakable.
- (+) The finance features (planned) have a natural home without coupling.
- (−) Plugin order and conflicts (two plugins decorating the same key) need defined rules. To be specified when `createCalendar` is implemented.
