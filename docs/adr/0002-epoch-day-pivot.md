# ADR 0002: Epoch day as the conversion pivot

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

Supporting several calendar systems (Gregorian, Persian, Islamic, ...) needs conversion between them. Pairwise converters grow quadratically.

## Decision

Every `CalendarImplementation` converts to and from an **epoch day**: the integer number of days since 1970-01-01 in the proleptic Gregorian calendar. Cross-system conversion is always `B.fromEpochDay(A.toEpochDay(date))`.

The Gregorian implementation uses Howard Hinnant's `days_from_civil` and `civil_from_days` algorithms (public domain), which are exact for all integer years.

## Consequences

- (+) A new calendar needs two conversion functions, not one per existing calendar.
- (+) Date arithmetic (`addDays`, comparison) is a simple integer operation in any system.
- (+) Round-trip correctness is easy to test exhaustively over a range of years.
- (−) The public `CalendarDate` stays a `{ system, year, month, day }` triple because it is more readable for users; the epoch day is an internal detail. Revisit if profiling shows conversion cost matters.
