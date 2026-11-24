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

**Demo.** `apps/vue-demo` uses the built package. It replaced `apps/vue-proto` when the adapter was complete. The smoke test of server rendering renders the four components with `renderToString` in a Node environment.

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

The core needed no change for Vue: the API frozen by ADR 0020 was enough. The findings below are about Vue itself.

1. **A Vue boolean prop that is not passed is `false`, not `undefined`.** In the core `undefined` means "not set" (ADR 0019), so a component that passes `false` for an option the user never gave changes its default. Every boolean prop of the components whose core default is not `false` has an explicit `undefined` default (`withDefaults`): `allowUnavailableInRange`, `closeOnSelect` and `showSeconds`. `portal` has the default `true` on purpose. React and Angular have no such rule.
2. **`v-bind` with handlers plus an explicit `@keydown` calls both.** React solves it by writing `onKeyDown` after the spread, which replaces the handler. In Vue the components bind only the attributes (`toVueProps(props, false)`) when they wire the event themselves (`keydown` and `focus` of the grid and of the time segments), and bind the handlers too only where the prop getter is the single source (days, months, years, buttons).
3. **A `.vue` file cannot export a type.** `DatePickerLabels` lives in its own `.ts` file, and there is no exported `CalendarProps`: the props are declared in the component and can be read with `InstanceType`.
4. **Generic components work.** `<script setup generic="M extends SelectionMode = 'single'">` is enough with `vue-tsc` 2.x, and the build emits one `*.vue.d.ts` per component. The two inner components (`CalendarHeader`, `CalendarDays`) are generic too: `Calendar<'single'>` is not assignable to `Calendar<SelectionMode>` (same finding as in the core tests).
5. **The focus request needs no counter.** `watch(() => state.focusRequest, focus, { flush: 'post' })` does not run for the first value and runs after the DOM is updated. It replaces the `seenFocusRequest` of React and Angular.
6. **The popover is a composable and a template.** `usePickerPopover` keeps the open state, the position, the click outside, Escape and the focus on open; the position uses `@floating-ui/dom` directly, a peer dependency. The listeners are added by a post-flush watcher on `open` and removed with `onCleanup`. `<Teleport to="body" :disabled="!portal">` replaces `renderLayer`, and `useId()` (Vue 3.5) gives the dialog id. Because the popover is not rendered while closed, nothing in it runs on the server.
7. **The "the text must stay as typed" flag** is reset with `nextTick` after the commit, not after every render as in React. If the parent does not accept the value, the flag cannot stay set.
8. **Server rendering works.** The tests for it run in the `node` environment (in `jsdom` a `document` always exists and an access in `setup` would go unnoticed): the four components render without a DOM and the closed pickers render no dialog. A hydration check in a real browser is not done yet.
9. **Build.** Vite library mode makes `index.js` (ES) and `index.cjs`, and `vue-tsc` makes the declarations; `vue`, `@calendrix/core` and `@floating-ui/dom` are external. `vue-tsc` writes relative imports without an extension, which TypeScript cannot resolve under `node16`, and one `.d.ts` cannot serve both ESM and CommonJS (`attw` reported "Internal resolution error" and "Masquerading as ESM"). `scripts/fix-declarations.mjs` runs after `vue-tsc`: it adds `.js` to the relative imports of every declaration file and writes a `.d.cts` twin with `.cjs` imports, and the `require` condition of `exports` points at `index.d.cts`. `attw` is green for the four resolution modes, like the React package. Its row for `styles.css` stays red in both packages: the tool does not know CSS.

### Result

The four components (`Calendar`, `TimeField`, `DatePicker`, `DateTimePicker`), the composables (`useCalendar`, `useTimeField`) and `toVueProps` are in `@calendrix/vue`, with 55 tests. The styles ship in the package (`@calendrix/vue/styles.css`), `apps/vue-demo` uses the built package, and `apps/vue-proto` is removed.
