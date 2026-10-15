# Architecture

## Goals

1. Write calendar logic **once** and reuse it in React, Angular and Vue.
2. Keep the core **small, dependency-free and fully testable** without a browser.
3. Make **accessibility and RTL** properties of the core, not an afterthought in each UI.
4. Allow new calendar systems and domain rules (holidays, market sessions) **without touching the core**.

## Layers

```
┌───────────────────────────────────────────────────────────┐
│ Your app                                                   │
├───────────────────────────────────────────────────────────┤
│ Adapters:  react │ angular │ vue      (thin, reactive glue)│
├───────────────────────────────────────────────────────────┤
│ Plugins:   persian │ islamic │ finance (opt-in)            │
├───────────────────────────────────────────────────────────┤
│ Core:      types │ calendar registry │ date helpers        │
│            createCalendar (state, selection, keyboard)     │
└───────────────────────────────────────────────────────────┘
```

Dependencies point **downwards only**. The core knows nothing about plugins or adapters.

## Core concepts

### CalendarDate

An immutable `{ system, year, month, day }`. It has no time and no time zone: a calendar day is a label, not an instant.

### CalendarImplementation

The contract each calendar system fulfils (`daysInMonth`, `monthsInYear`, `isLeapYear`, `toEpochDay`, `fromEpochDay`). The **epoch day** (days since 1970-01-01 Gregorian) is the single pivot. Converting between any two systems is `B.fromEpochDay(A.toEpochDay(date))`, so adding a new system never requires N×N converters. See [ADR 0002](adr/0002-epoch-day-pivot.md).

### Calendar (planned)

`createCalendar(options)` returns an object with:

- `getState()` / `subscribe()`: an external store compatible with `useSyncExternalStore`, Vue refs and Angular signals.
- Actions: navigation, selection, `handleKeyDown`.
- **Prop getters** (`getDayProps`, `getGridProps`, ...) returning ARIA attributes and handlers, in the style of Downshift and TanStack. See [ADR 0001](adr/0001-headless-core.md).

### Plugins (planned)

A plugin can register calendar systems, decorate days with metadata (a holiday name, "market closed") and mark days unavailable. See [ADR 0003](adr/0003-plugin-system.md).

## Adapter contract

An adapter must do only three things:

1. Create one calendar instance per component and forward option changes via `setOptions`.
2. Bridge `subscribe`/`getState` into the framework's reactivity.
3. Spread the output of the prop getters onto elements.

If an adapter needs more than that, the core API is missing something. Fix the core instead.

## Testing strategy

- **Core:** exhaustive unit tests (boundaries, round-trips, keyboard behavior).
- **Adapters:** a small shared integration suite verifying that each adapter exposes the same behavior.
- **Accessibility:** automated checks (axe) plus manual screen reader passes before each release.
