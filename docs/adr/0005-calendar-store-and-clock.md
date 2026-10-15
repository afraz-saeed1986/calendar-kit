# ADR 0005: Calendar as a stable-snapshot store with an injectable clock

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

`createCalendar` must work with `useSyncExternalStore` in React, refs in Vue and signals in Angular. It must also be testable without waiting for real dates: "today" changes every day and depends on the time zone.

## Decision

**Store contract.** `createCalendar` returns `getState()` and `subscribe()`. `getState()` returns the **same object** until something changes, because `useSyncExternalStore` compares snapshots by reference and re-renders (or loops) if every call returns a new object. The state is built lazily on the first read after a change and cached.

**Injectable clock and time zone.** "Today" comes from the `now` option (default `() => new Date()`) read in the `timeZone` option (default: the runtime's). Tests pass a fixed `now`. The date in that time zone is read with `Intl` and turned into an epoch day, so no conversion between calendar systems is needed.

**Fixed six-week grid.** `weeks` always has 6 rows of 7 days, so the height of a calendar never jumps between months. Days from neighbouring months are flagged with `isOutsideMonth`.

**Locale defaults.** Week start comes from the locale's week data (`Intl.Locale`), with a fallback by system for runtimes without it. Text direction comes from the language. Both can be overridden with options.

**Changing the system.** When `setOptions` changes `system`, the focused day is converted to the new system, so the user stays on the same real day.

## Consequences

- (+) Adapters are a few lines: subscribe, read `getState()`, render.
- (+) Tests are deterministic and cover time-zone edge cases (for example 21:00 UTC is already the next day in Tehran).
- (+) Stable layout without extra work in every adapter.
- (−) The snapshot is not rebuilt when midnight passes without any other change, so "today" can be stale until the next interaction. Adapters that stay open across midnight can call `setOptions({})` on a timer.
- (−) Building the state creates a few `Intl` formatters, so it costs a little on every change. Fine for a month view; cache per locale if profiling says otherwise.
