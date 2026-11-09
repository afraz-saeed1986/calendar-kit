# ADR 0013: Popover positioning, portal and focus

- Status: accepted
- Date: 2026-11-09

## Context

`<DateTimePicker/>` (ADR 0009) renders its popover with plain CSS, absolutely positioned under the input. This has three problems:

1. It does not flip or shift near viewport edges, so the popover can be clipped or leave the screen.
2. It is rendered inside the picker wrapper, so an ancestor with `overflow: hidden`, `transform` or a low `z-index` can clip or cover it.
3. Focus is not managed. Tab can leave the open dialog, which breaks the `role="dialog"` contract.

## Decision

**Positioning.** Use `@floating-ui/react-dom` in `@calendrix/react` only. The core and `@calendrix/persian` stay dependency-free. Middleware: `offset`, `flip`, `shift` (with padding), and `size` (to cap `max-height` and `max-width` to the available space). `autoUpdate` keeps the position correct on scroll, resize and content size changes (for example a month view with 1 to 3 months). Placement is `bottom-start`, mirrored automatically in RTL.

**Portal.** The popover renders into `document.body` through `createPortal` by default. The prop `portal={false}` renders it in place, inside the wrapper. The strategy is `fixed` when portaled. A string or element container is out of scope for now.

**Outside click.** The pointerdown check treats the wrapper and the popover as one region, because the popover is no longer a DOM descendant of the wrapper. React synthetic events still bubble through portals, but the native document listener does not, so it checks both refs.

**Focus.**
- On open, focus moves to the focused day (unchanged).
- A focus trap keeps Tab and Shift+Tab inside the popover: from the last tabbable element Tab goes to the first, and the reverse for Shift+Tab. Tabbable elements are found at keydown time, so view switches do not break it.
- Escape closes the popover and returns focus to the input (unchanged, ADR 0010 and 0011 rules about inner Escape still apply first).
- Closing with Done also returns focus to the input. Picking a date keeps the popover open, so the time can be set next.
- No `aria-modal`: the page behind stays reachable by pointer, and outside click closes the popover.

**Styling.** Floating-ui coordinates are applied as inline `position`, `top` and `left`. `z-index` is a CSS variable, `--calendrix-z-popover`, with a high default.

## Consequences

- One new runtime dependency in `@calendrix/react`.
- The popover works inside clipped or scrolled containers by default.
- Tests run in jsdom, which has no layout, so tests check wiring (portal target, trap, focus return, outside click), not pixel positions. Real flip behavior is verified manually in the demo.
- SSR: the portal renders only after mount, so the server markup stays unchanged.
- Angular and Vue adapters will reuse the same decisions with their own floating-ui packages.