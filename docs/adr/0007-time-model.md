# ADR 0007: Time model, wall-clock values and time zones

- **Status:** Accepted (to be validated by the Angular and Vue prototypes in M3)
- **Date:** 2026-11-02

## Context

A date and time picker has to answer two questions that a plain date picker avoids: what is the value the user picked, and which moment in time does it mean. "09:30 on 14 October" is not a moment until a time zone is known, and around daylight saving changes some wall times do not exist or happen twice.

## Decision

**The picked value is a wall-clock value.** `DateTimeValue` is `{ date, time }`: a `CalendarDate` in any registered system and a `TimeValue` (`hour`, `minute`, `second`, 24-hour clock). It has no time zone, so it means exactly what the user saw and typed. The time field itself works with `TimeValue | null`, and the calendar keeps working with `CalendarDate | null`.

**Conversion to a moment is explicit.** `toInstant(value, timeZone?)` returns a `Date`, and `fromInstant(instant, timeZone?, system?)` goes back. Both use `Intl.DateTimeFormat` with a cached formatter per time zone, so the core needs no time zone database. Without a time zone the runtime's own is used, and tests pass one explicitly.

**Daylight saving uses the "compatible" rule** (the same as `Temporal` and most platforms):

- a wall time that does not exist (clocks jump forward) moves forward by the length of the gap: 02:30 on a day when 02:00 becomes 03:00 gives 03:30;
- a wall time that happens twice (clocks go back) gives the first of the two instants.

**Output formats for forms and servers.** `formatISODate` always gives a Gregorian `YYYY-MM-DD`, even for a Persian date, because that is what servers and `<input type="date">` expect. `formatISOTime` gives `HH:mm` or `HH:mm:ss`. The parsers return `null` instead of throwing, because they are used on user input.

**The time field is its own store**, `createTimeField`, with the same contract as `createCalendar` (`getState` returns a stable snapshot, `subscribe`, `setOptions` that does nothing when no option changed, prop getters that return `attrs` and `handlers`). It does not depend on the calendar, so it can be used alone as a time input.

- The field is made of segments (hour, minute, optionally second, and AM/PM on a 12-hour clock). Each segment is a `spinbutton` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext`.
- The 12 or 24-hour clock comes from the locale unless `hourCycle` is given. Numerals and AM/PM text come from `Intl`, so `fa-IR` shows Persian digits.
- Typing accepts Latin, Persian and Arabic-Indic digits. Two digits, or a first digit that cannot start a longer number, complete the segment and make the next one active.
- Arrow keys wrap inside the segment without carrying (59 minutes + 1 = 00), and Home and End jump to the limits.
- Values outside `minTime` and `maxTime` are rejected, not clamped.

## Consequences

- (+) The value is never silently shifted by a time zone, and the conversion that can go wrong is one function that is tested around daylight saving changes.
- (+) A Persian user and a German user can pick the same moment: the wall-clock value converts to a Gregorian ISO date for the server.
- (−) A wall-clock value alone is not enough to schedule something. Applications must decide the time zone and call `toInstant`.
- (−) After typing completes a segment, `activeSegment` changes; moving the real DOM focus to that segment is the adapter's job, like the focused day in the calendar.
- (−) Segments appear in a fixed order (hour, minute, second, AM/PM). Locales that put AM/PM first are not handled yet.
- (−) An empty field becomes `minTime` or 00:00:00 on the first edit, instead of tracking partly filled segments.
