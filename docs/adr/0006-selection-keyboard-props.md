# ADR 0006: Selection, keyboard handling and prop getters

- **Status:** Accepted (to be validated by the Angular and Vue prototypes in M3)
- **Date:** 2026-10-29

## Context

A calendar must let the user pick a day, move around with the keyboard and expose the right ARIA attributes. All of that is easy to get subtly wrong, so it belongs in the core, once, instead of in every framework adapter. The adapters still have to attach it to elements with very different syntax: React uses `onClick` and `tabIndex`, Vue uses `@click`, Angular uses `(click)`.

## Decision

**Prop getters return `attrs` and `handlers` separately.** `attrs` use DOM attribute names (`tabindex`, `aria-selected`, `data-today`) and `handlers` use DOM event names (`click`, `keydown`). An adapter maps those names to its own syntax in a few lines. Attributes with the value `undefined` are left off the element.

**Keyboard handling lives in the core.** `handleKeyDown(event)` takes a minimal `KeyEventLike`, so the core needs no DOM types. It returns `true` and calls `preventDefault()` only for keys it handles, and ignores any key pressed with Ctrl, Meta or Alt, so browser shortcuts keep working. The keys follow the ARIA grid pattern:

- Arrow keys move by day and week. In right-to-left languages, the right arrow goes back in time.
- Home and End go to the start and end of the week (which depends on `weekStart`).
- PageUp and PageDown change the month, with Shift the year. The day is clamped to the length of the target month.
- Enter and Space select the focused day.

The single `keydown` handler sits on the grid, not on each cell, because keyboard events bubble up from the focused cell.

**Controlled and uncontrolled value.** Passing `value` (even `null`) makes the calendar controlled: `select` only calls `onChange`, and the value changes when the parent passes a new one. Without `value`, the calendar keeps the value itself, starting from `defaultValue`. A new `value` moves the focus so it is visible, but an unchanged value does not.

**`setOptions` does nothing when no option changed** (compared with `Object.is`), because adapters call it on every render and an update that notifies subscribers on every render would loop.

**Disabled and unavailable days cannot be selected.** They stay focusable with the keyboard (as the ARIA grid pattern allows) and are marked with `aria-disabled`.

**Built-in texts** (the "previous month" and "next month" button labels) come from a small table by language (English, Persian, German), can be overridden with the `labels` option and fall back to English.

## Consequences

- (+) Every adapter gets identical behavior and accessibility from a thin mapping layer.
- (+) The core stays free of DOM types and is tested with fake events.
- (−) Moving the real DOM focus after the focused day changes is the adapter's job: after a keyboard move it must focus the element whose `tabindex` is `0`.
- (−) Adapters must keep callbacks such as `onChange` and `isDateUnavailable` referentially stable, or `setOptions` will see a change on every render.
- (−) Only `single` selection exists. Range and multiple selection will extend `value` and `onChange` later (see the roadmap).
