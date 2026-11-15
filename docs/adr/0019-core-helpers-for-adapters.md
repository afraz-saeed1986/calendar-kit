# ADR 0019: Core helpers that every adapter needs

- Status: accepted
- Date: 2026-11-15

## Context

ADR 0015 built three adapters (React, Angular, a Vue prototype) on the same core. Three pieces of code were written three times, line by line (findings 23, 24 and 26):

1. Dropping the options that are not set (`definedOnly`), because `undefined` must not reach the core. This also hides a bug: an option that is dropped is never cleared, so an input such as `minDate` that goes from a date back to `undefined` keeps the old date in the core.
2. The rule for the boolean attributes of `ElementProps`: `aria-*` and `data-*` keep `true` and `false` as text, other attributes are present or absent. Angular and the Vue prototype write it by hand; React gets the same result from React DOM, which renders booleans in `aria-*` and `data-*` as text. Today the core returns a boolean only for those attributes, but the rule is part of the contract.
3. Moving the DOM focus to the focused cell after a keyboard action or a view change.

After the v1 freeze, changing how these work is a breaking change, so they are decided now.

## Decision

1. **An option set to `undefined` means "not set", also in `setOptions`.** This already works: the core reads every option with `??` or `!== undefined`, and `setOptions` merges the keys it is given, so a key with the value `undefined` unsets the option. What was missing is the guarantee: it is now documented on `setOptions` and tested for `createCalendar`, `createTimeField` and `setOptions`. Adapters stop dropping keys (`definedOnly` goes away) and pass every input as it is, so an input that goes back to `undefined` is cleared. No change of behaviour or of types.
2. **The core exports `normalizeAttributes(attrs)`.** It applies the rule for booleans and returns only strings, leaving out the attributes that are absent. Each adapter keeps its own mapping of handlers (`onClick`, listeners), which is framework code. React keeps `toReactProps`, because React DOM applies the same rule; the Angular directive and `vueProps` use the helper, and so will an adapter for any framework without that behaviour. The rule is also documented on `ElementProps`.
3. **Focus: a `focusRequest` in the state.** `getState()` has a number, `focusRequest`, that starts at 0 and grows by one whenever the focus should move to the focused cell: after a key that `handleKeyDown` handled, and after a change of the view (the month and year buttons, the cells of the months and years, Escape from those views). `createTimeField` gets the same field for the segment focus (finding 9). The rule for adapters: after a render, if `focusRequest` is different from the last value seen, focus the cell with `tabindex="0"`; the first value seen is only remembered.

## Why a counter in the state

The adapters had to tell two cases apart: a handled key that changed the state (focus after the next render) and one that did not, for example an arrow key at `minDate` (no render is coming, focus at once). Because the counter changes the snapshot every time, a render always follows, and the rule is the same everywhere. The cost is one field in the state that says nothing about dates.

An option `onFocusRequest` was rejected because the callback cannot tell the adapter whether a render is coming, so the two cases would remain. Leaving the logic in the adapters was rejected because it is already written three times in the same way.

## Out of scope

The "text field state machine" (typed text, blur, validity; finding 12 of ADR 0015) is a new export, not a change of existing behaviour, so it can wait until after v1.

## Done when

The three decisions are implemented with tests in the core, the three adapters use them (and lose their own copies of `definedOnly`, the boolean rule and the focus flag), and the ADR 0015 findings 23, 24 and 26 point to this ADR.