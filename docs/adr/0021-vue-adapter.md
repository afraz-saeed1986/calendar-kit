# ADR 0021: The Vue adapter

- Status: accepted
- Date: 2026-11-16

## Context

The v1 API of the core is frozen (ADR 0020). `@calendrix/react` and `@calendrix/angular` are complete. For Vue there is only a prototype (`apps/vue-proto`: a `useCalendar` composable and a days-only `Calendar`, with six tests). The prototype already answered the questions of ADR 0015: a `shallowRef` fed by `subscribe` needs no wrapper, `v-bind` takes the prop getters after a small conversion, and `focusRequest` moves the focus with a `watch`.

## Decision

**Package.** `packages/vue`, published as `@calendrix/vue`. Vue 3.5 or newer. Peer dependencies: `vue`, `@calendrix/core` and `@floating-ui/dom` (for the popover).

**Components.** The same four as the other adapters, with the same names as in React: `Calendar`, `TimeField`, `DatePicker` and `DateTimePicker`. The props are the options of the core, with the same names and defaults. Composables for custom UIs: `useCalendar` and `useTimeField`, and the helper `toVueProps` (the `vueProps` of the prototype).

**Values.** `modelValue` and `update:modelValue`, so `v-model` works. A `modelValue` that is `undefined` leaves the component uncontrolled, as in the other adapters. The pickers add a `disabled` prop. Vue has no counterpart of `ControlValueAccessor`: form libraries use `v-model`, so there is no forms step.

**Focus events.** `update:focusedDate` for the focused day of `Calendar`.

**Source format.** Single-file components (`.vue`) with `<script setup lang="ts">`; generic components for the selection mode (`generic="M extends SelectionMode = 'single'"`), as in the prototype.

**Build.** Vite library mode with `@vitejs/plugin-vue`, ES and CommonJS output, and the type declarations from `vue-tsc --declaration --emitDeclarationOnly`. `tsup` cannot compile `.vue` files (see ADR 0015 for the same reason in Angular). Vue, the core and Floating UI are external.

**Popover.** A `usePopover` composable with the rules of ADR 0013 (Floating UI, outside press, Escape, Tab trap, focus on open) and `<Teleport>` to `<body>`. The prop `portal` (default `true`) turns the teleport off with `:disabled`. Vue removes teleported nodes itself, so the cleanup that Angular needed (finding 10 of ADR 0015) is not needed here.

**Styles.** `@calendrix/vue/styles.css`, copied at build from `packages/styles` (ADR 0017).

**Tests.** Vitest, `@vue/test-utils` and jsdom, as in the prototype. The same cases as the Angular library: keyboard, ranges, views, popover, pickers, typed text, options that go back to `undefined`.

**Demo.** `apps/vue-proto` stays as the demo until the adapter is complete. Then its own components are replaced by the package, and it is renamed to `apps/vue-demo`. A smoke test of server rendering (`vite build --ssr`) comes in the last stage.

## Stages

Each stage ends with tests and a commit; findings that change the core (they should be rare after ADR 0020) are written here before the next stage starts.

1. Package skeleton and build; `useCalendar`, `useTimeField` and `toVueProps` moved from the prototype.
2. `Calendar` (days, months and years views, several months, range and multiple selection).
3. `TimeField`.
4. `usePopover` and the popover tests.
5. `DatePicker`.
6. `DateTimePicker`.
7. Styles in the package, demo app, server rendering check.

## Done when

The four components pass the tests above, the demo app uses the package, the styles ship in it, a server rendering smoke test passes, and the findings of each stage are written under "Findings".

## Findings

(Written per stage.)