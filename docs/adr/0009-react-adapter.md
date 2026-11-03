# ADR 0009: React adapter

- **Status:** Accepted (to be validated by the Angular and Vue prototypes in M3)
- **Date:** 2026-11-03

## Context

The core is a set of framework-free stores. The React adapter has to make them feel native: state that re-renders components, options that can be written inline in JSX, correct focus, and components that look right without forcing a design.

## Decision

**Hooks are thin wrappers over the stores.** `useCalendar` and `useTimeField` create one store per component and read it with `useSyncExternalStore`. Because `getState()` returns the same object until something changes, there are no extra renders and no tearing in concurrent rendering.

**Options are stabilized, not memoized by the user.** React code makes a new callback, date or plugin array on every render, while the core wants to hear only about real changes (ADR 0006). The adapter replaces every function option with one permanent function that calls the latest one, and keeps the previous identity of values that are equal in content. Users write `onChange={(v) => ...}` and `minDate={createDate(...)}` inline, and nothing loops. An option that disappears is passed as `undefined`, so the core can reset it.

**Options are applied in a layout effect, not during render.** Updating a store notifies its subscribers, and that must not happen while React renders. A layout effect runs before the browser paints, so the user never sees the old value.

**The adapter owns the real DOM focus.** The core only says which element should have `tabindex="0"`. After a keyboard move, `<Calendar />` focuses that day; after typing completes a segment, `<TimeField />` focuses the next segment. A flag is set only when the state really changed, so a later unrelated render never steals the focus.

**Components have no styles; one optional stylesheet adds them.** Components render semantic elements, `calendrix-*` classes and `data-*` state attributes (`data-today`, `data-outside-month`, ...). `@calendrix/react/styles.css` is plain CSS driven by `--calendrix-*` variables declared on `:root`, so any ancestor can override them. Dark mode follows the system, and `data-theme` on any element forces a theme for its content. Plain CSS has no build step for the user, works with every bundler and with Tailwind.

**`<DateTimePicker />` is the composition of the pieces.** It is a text input plus a popover with `<Calendar />`, `<TimeField />`, Clear and Done.

- The value is the core's wall-clock `{ date, time }` (ADR 0007), controlled or uncontrolled.
- Typing is read with `parseDateTime` (ADR 0008). While the user types, the text is left as typed; it is rewritten in the standard form on blur.
- Picking a date without a time gives midnight. A time chosen before any date is kept and joins the first date.
- The picker registers calendars of its plugins itself, so a Persian date can be typed before the popover was ever opened.
- Escape and a click outside close the popover. Arrow Down in the input opens it.

## Consequences

- (+) Users write plain JSX with inline options and still get stable, minimal updates.
- (+) Accessibility and behavior come from the core; the React code is mostly glue.
- (+) Theming needs no JavaScript and no CSS-in-JS runtime.
- (−) The stabilizer compares plain objects and arrays by content. A plugin object with its own inline functions is seen as changed on every render; define plugins once, outside the component.
- (−) The popover is positioned below the input and does not flip near the edge of the viewport. It has no focus trap, so Tab can leave it.
- (−) Time segments are `span` elements, so the on-screen keyboard of phones does not open when one is tapped. A hidden input for touch devices is planned (M4).
- (−) During server rendering, "today" comes from the server's clock. Pass `now` and `timeZone` when the server and the browser must agree.
