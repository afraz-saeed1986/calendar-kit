# ADR 0004: Persian calendar backed by Intl

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

The Persian (Jalali) calendar needs a conversion to and from the epoch day (see [ADR 0002](0002-epoch-day-pivot.md)). Two options exist:

1. Implement a Jalali algorithm in the library, for example the well-known 33-year arithmetic rule or a table of leap-year breaks.
2. Delegate to the platform through `Intl.DateTimeFormat` with the `persian` calendar.

## Decision

Use `Intl`. `fromEpochDay` formats a UTC date with `en-US-u-ca-persian-nu-latn` and reads the year, month and day parts. `toEpochDay` is the inverse: `Intl` only converts in one direction, so it estimates the epoch day from the mean year length and then walks day by day until `fromEpochDay` agrees. Leap years are detected by measuring the distance between two Nowruz days (366 days means leap).

The formatter is created once at module level, because constructing it is much more expensive than using it.

## Consequences

- (+) No algorithm or leap-year table to maintain, and no extra bytes in the bundle.
- (+) Consistent with the platform: formatted dates and the calendar logic come from the same ICU data.
- (+) Moving to the Temporal API later only changes this file, because everything sits behind `CalendarImplementation`.
- (−) **Leap years follow the ICU implementation of the runtime**, which can differ from the official Iranian calendar in rare years. Test expectations cover the years that matter today (1395 to 1408). Revisit before supporting dates far in the past or future.
- (−) Requires full ICU data. Node 13+ and modern browsers include it. A runtime without it throws a clear error.
- (−) `toEpochDay` costs a few `Intl` calls. Fine for rendering a month; if it shows up in profiles, cache per year.
