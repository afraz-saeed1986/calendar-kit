# ADR 0001: Headless core with thin framework adapters

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

The library must work in React, Angular and Vue. Re-implementing calendar logic per framework triples the bug surface, and calendar logic (leap years, week starts, keyboard navigation, RTL) is where the bugs are.

## Decision

Put all logic in a framework-agnostic TypeScript core exposing:

- an external store (`getState`, `subscribe`), and
- **prop getters** returning ARIA attributes and event handlers.

Adapters only bridge the store into the framework's reactivity and spread prop getters onto elements.

## Consequences

- (+) Behavior is identical across frameworks and tested once.
- (+) Consumers can build any UI on top of the core.
- (−) Slightly more work for users who only want a ready-made component; mitigated by shipping default components per adapter.
- (−) The core API must be designed carefully; validated with early Angular and Vue prototypes before freezing v1 (see roadmap M3).
