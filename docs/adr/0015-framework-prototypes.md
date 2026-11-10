# ADR 0015: Angular adapter, and Vue prototype, to validate the core API

- Status: accepted
- Date: 2026-11-10

## Context

The core (`@calendrix/core`) was designed to serve any framework (ADR 0001), but only React uses it. Before freezing the v1 API (roadmap M3), we need to know whether the core is as easy to use from Angular and Vue as it is from React. Problems found after the freeze are breaking changes.

## Decision

**Angular: the real adapter, built in stages.** `@calendrix/angular` has the same four components as `@calendrix/react`: `Calendar`, `TimeField`, `DatePicker` and `DateTimePicker`, built in this order. The findings of each stage (below) may change the core before the next stage starts. Angular 21, standalone components, signals (`input()`, `model()`, `output()`, `signal`, `computed`).

Selectors: `calendrix-calendar`, `calendrix-time-field`, `calendrix-date-picker`, `calendrix-date-time-picker`. The props of the React components are the inputs, with the same names and defaults.

**Layout.** `packages/angular` is an Angular CLI workspace with a library project (`calendrix-angular`, published as `@calendrix/angular`) and a demo application. The library is built with `ng-packagr` (the Angular Package Format), because `tsup` cannot compile Angular components. Tests use the test runner of the Angular CLI (Vitest).

**How the core is used.** The snapshot of `getState()` is held in a `signal`, set from `subscribe`, and the subscription is closed with `DestroyRef`. The options are signal inputs, passed to `setOptions` in an `effect`. The prop getters (`{ attrs, handlers }`) are applied with a directive. The pickers use the same popover rules as React (ADR 0013, ADR 0014).

**Vue: a small prototype, after the Angular `Calendar`.** A `useCalendar` composable and a `Calendar` component in a private app, only to answer the same questions for Vue. A full Vue adapter comes later.

**Out of scope for now:** forms integration (`ControlValueAccessor` is its own step), publishing, and the shared stylesheet (see question 8).

## Questions the adapters must answer

1. Do `getState` and `subscribe` (stable snapshots) fit signals and refs without a wrapper?
2. Is `{ attrs, handlers }` from the prop getters easy to apply in Angular templates and in Vue, or does it need a helper in each adapter? Should the core offer one?
3. How are changed options passed to `setOptions` (partial options, `undefined` values)?
4. Controlled and uncontrolled values: how do the core's `value` and `onChange` map to `model()` and `v-model`?
5. Focus: React moves the DOM focus itself after a state change. Is this logic the same in every adapter? Should the core offer a "focus request" in its state?
6. Does a `KeyEventLike` accept the native keyboard events of both frameworks?
7. Are the `now` and `timeZone` options enough for tests and server rendering in both?
8. The stylesheet: `styles.css` is shared by the class names. Should it move to its own package, or be copied?

## Done when

Both adapters (Angular full, Vue prototype) pass their tests, and each question has an answer here (a short note under "Findings"), with the changes to the core, if any, listed. Then the v1 API is frozen (roadmap M3).

## Findings

To be filled in while building the adapters.