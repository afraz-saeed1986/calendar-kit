# ADR 0012: Several visible months

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

Picking a range that crosses a month boundary is awkward when only one month is visible. Range pickers show two months side by side. The roadmap had this as an open decision ("multi-month views in `state`"); it is decided here, before the API is frozen.

## Decision

**An option sets how many months are visible.** `visibleMonths` is 1 (default), 2 or 3. Other values are clamped. It works in every selection mode.

**The visible window is its own state.** Until now the visible month was the month of the focused day. With several months the focused day can be in the second one without the first one moving, so the core keeps the first visible month (`shown`) and guarantees that the focused day is inside the window. The window moves only when the focus leaves it:

- Before the first month, the focused month becomes the first one.
- After the last month, the window moves forward so that the focused month is the last one.
- `goTo`, `goToToday`, choosing a month or a year, and a new value or focused date show their month **first**.

**The state describes every month.** `state.grids` is a list of `{ year, month, label, weeks }`. `weeks`, `monthLabel`, `monthName`, `yearLabel` and `visibleMonth` keep describing the first visible month, so code for one month does not change. `state.visibleLabel` is one label for the whole window ("October 2026 – November 2026").

**Moving.** The previous and next buttons and PageUp and PageDown move the window and the focus by **one** month. The arrow keys move the focus, and the window follows only when the focus leaves it.

**Days outside a month.** Every grid still has 6 weeks of 7 cells, and `isOutsideMonth` is true for the days that belong to the previous or next month of that grid. With one month, adapters show them dimmed, as before. With several months they leave those cells empty, so every day appears once: there is one focusable cell and no duplicate label.

**Header and views.** Only the first month has the month and year buttons and the previous button; only the last has the next button. The other months have a plain title. The months and years views always show a single panel for the first visible month: opening them moves the focus into that month.

**Several grids, one keyboard.** `getGridProps(index)` returns the props of one grid (its label), all with the same key handler, so an adapter can render one `role="grid"` per month inside a shared container.

**Small screens.** The core does not decide this. An adapter or an app can pass `visibleMonths: 1` on narrow screens.

## Consequences

- (+) A range can cross months with both ends visible, as users expect.
- (+) One month works exactly as before: the same state, the same props, no extra cost.
- (−) The state has a second description of the first month (`weeks` and `grids[0]`) to keep older code working.
- (−) The months and years views do not support several panels. They apply to the first visible month.
- (−) There is no automatic responsive behavior; the app decides.
