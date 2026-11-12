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

### Angular `Calendar` (stage 1)

1. **Snapshots and signals.** `getState()` and `subscribe` fit signals with no wrapper: a `signal` set from `subscribe` works, and because the snapshot object only changes when the state does, signal equality is enough. No change to the core.
2. **Prop getters.** `{ attrs, handlers }` needs a small helper in each adapter (`CalendrixPropsDirective`, the counterpart of `toReactProps`, about 50 lines). The format itself is fine. The rule for booleans (`aria-*` and `data-*` keep `true` and `false` as text, other attributes are present or absent) lives in the adapter and is not written anywhere in the core: it should be documented on `ElementProps`.
3. **Options.** An input that is not set must not be passed to the core as `undefined`, so the adapter drops those keys. The core reads some options only when it is created: seen with `now` (the focused day was the real today, not the injected one) and confirmed for `defaultValue` (a `TimeField` test with Persian numerals); `timeZone` and `focusedDate` are expected to behave the same. So an adapter has to create the core once the inputs are known (`ngOnInit`) and use `setOptions` only for later changes. This should be documented on `createCalendar` and `setOptions`.
4. **Values.** `model()` maps well: the core's `onChange` writes the model, and the model is passed back as `value`. A model that is still `undefined` leaves the core uncontrolled, so the first pick switches it to controlled with the same value.
5. **Focus.** The same logic as in React was needed: remember that a keyboard action or a view change changed the state, and move the DOM focus to the focused cell after the next render (`afterEveryRender` in Angular). It is identical in the adapters, so it is a candidate for the core (a "focus request" in the state). To be decided after the Vue prototype.
6. **Keyboard events.** A native `KeyboardEvent` is accepted by `handleKeyDown` as it is.
7. **`now` and `timeZone`.** Enough for tests once the core is created with them (see 3).
8. **Stylesheet.** Open.

### Angular `TimeField` and popover (stages 2 and 3)

9. **Shared code.** `definedOnly` is needed by every component and moved to its own file. The segment focus logic of `TimeField` is the same as in React: it supports finding 5 (a "focus request" in the core).
10. **Portal.** A popover moved to `<body>` is not removed by Angular when its host view is destroyed: Angular removes only the nodes it finds in the view. The directive must remove its own element. The same applies to any adapter that moves nodes by hand (a Vue `Teleport` handles this itself).
11. **Positioning.** `@floating-ui/dom` works without a wrapper (the same rules as the React adapter) and is a peer dependency of the Angular library. The popover logic (position, outside press, Escape, Tab trap, focus on open) is about 100 lines, the same as `usePickerPopover`.
