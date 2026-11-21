# ADR 0026: The theme of a parent reaches a portaled popover

Status: accepted

## Context

The pickers move their popover to the end of `<body>` (`portal`, ADR 0013), so that no ancestor
can clip it. The colours come from CSS variables that `styles.css` sets on any element with
`data-theme="dark"` or `data-theme="light"`, and on `:root` when the system is dark. A popover in
`<body>` is no longer inside the element that holds `data-theme`, so it ignores it: a page with
`<section data-theme="dark">` gets a light popover next to a dark input, and a page with
`data-theme="light"` on an element, when the system is dark, gets a dark one. The `portal` option
says so in its comment ("does not reach a portaled popover").

## Decision

1. **The popover gets the `data-theme` of the nearest ancestor of its anchor.** When the popover
   opens, the adapter looks for the nearest element that has `data-theme`, starting at the anchor
   itself (`closest('[data-theme]')`), and sets the same value on the popover. The CSS does not
   change: the variables are set on any element with that attribute, and the content of the
   popover inherits them.
2. **Only when the popover is portaled.** Without `portal` the popover is still inside its
   ancestors and inherits everything.
3. **The value is copied as it is,** so a theme of the application with its own name (a rule
   `[data-theme='sepia'] { … }` in the application's CSS) works too.
4. **It is read when the popover opens, and not watched.** A theme that changes while a popover is
   open is rare, and the next opening is right. A `MutationObserver` for it is not worth its cost.
5. **No ancestor with `data-theme`: nothing is set.** The system preference decides, as before.
6. **In the adapters, not in the core,** because the core holds no DOM: React sets the attribute
   in the ref callback of the popover (before the first paint), Vue in a post-flush watcher on the
   popover element, Angular in `CalendrixPopover` before it moves the element.

## Not decided here

- CSS variables that an application sets with a class or on another ancestor (for example
  `.brand { --calendrix-accent: … }`) do not reach a portaled popover either. `data-theme` is the
  documented way to switch themes; a general answer (for example a `portalClassName`) is left for
  later.

## Plan

1. React, Vue and Angular, one by one, with tests.
2. The comments of the `portal` option, `docs/api.md` (if it says it), the roadmap, the Result
   section.

   
## Result

Done in all three adapters. The CSS did not change.

- **React:** the ref callback of the popover in `usePickerPopover` copies the theme before the first paint. 4 new tests.
- **Vue:** a post-flush watcher on `popoverRef` in `usePickerPopover`. 4 new tests (95 in the package).
- **Angular:** `CalendrixPopover` copies the theme before it moves the element. 4 new tests (88 in the library).
- **The comments** of the `portal` option of the three `DateTimePicker`s say that the theme is copied.