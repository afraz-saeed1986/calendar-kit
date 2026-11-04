# ADR 0011: Range and multiple selection

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

Single-day selection is not enough for bookings, reports and filters. The shape of `value` and `onChange` is the part of the API that is hardest to change later, so range and multiple selection are designed before the API is frozen (M3).

## Decision

**One option picks the mode.** `selection` is `'single'` (default), `'range'` or `'multiple'`. Existing code keeps working because `'single'` is the default.

**The value type follows the mode.**

| Mode       | `value` / `defaultValue` / `onChange`             |
| ---------- | ------------------------------------------------- |
| `single`   | `CalendarDate \| null`                            |
| `range`    | `DateRange \| null`, `{ start, end }`             |
| `multiple` | `CalendarDate[]` (empty array means no selection) |

`Calendar` and `CalendarOptions` get a type parameter for the mode (default `'single'`), so a range calendar cannot be given a single date by mistake. `createCalendar` uses overloads to pick it from the `selection` option.

**Range: two clicks, and a pending start in the state.**

- The first click sets the anchor (`state.anchor`). `onChange` is **not** called yet and the value does not change.
- The second click completes the range and calls `onChange({ start, end })`. If it is before the anchor, the two dates swap. The same day twice gives a one-day range.
- A click after a complete range starts a new one: it sets a new anchor, and the old value stays until the new range is complete.
- `Escape` cancels a pending anchor. The calendar handles it, so a picker around it does not close.
- While an anchor is pending, `previewTo(date)` shows the range up to that day (adapters call it on pointer enter, and the core calls it when the keyboard moves the focus). The preview never changes the value.
- Days that are disabled or unavailable cannot be an anchor or an end. A range that **contains** unavailable days is allowed by default (a weekend inside a booking), and `allowUnavailableInRange: false` refuses it.

**Multiple: a click toggles.** Enter and Space toggle too. `onChange` gets the dates sorted from the oldest to the newest. `maxSelected` stops adding when reached.

**New cell fields and attributes.** `DayCell` gets `isRangeStart`, `isRangeEnd`, `isInRange` (days between the ends) and `isInPreview`. They appear as `data-range-start`, `data-range-end`, `data-in-range` and `data-in-preview`. `aria-selected` is true for the ends, the days in between and every day of a multiple selection.

**Keyboard.** The same keys as now. Enter or Space on a day acts like a click in the active mode. Moving the focus with an anchor pending updates the preview.

**Out of scope for this step.** `DateTimePicker` with a range (two times), minimum and maximum length of a range, and presets such as "last 7 days". The decisions above leave room for all of them.

## Consequences

- (+) One store handles all three modes, so adapters render cells and nothing else.
- (+) The default mode keeps every existing call valid.
- (+) The cell flags make the usual range styling possible with CSS only.
- (−) The type parameter makes `Calendar` types a little more complex. The default parameter keeps simple code simple.
- (−) The pending anchor is state that lives only in the store. A controlled component cannot restore it.
- (−) `multiple` in months and years views only marks the months and years that contain a selected day.
