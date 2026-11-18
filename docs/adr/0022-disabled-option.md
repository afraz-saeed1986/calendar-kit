# ADR 0022: The `disabled` option of the core

Status: accepted

## Context

The pickers already have a `disabled` input, but it only disables their `<input>` and toggle
button. `Calendar` and `TimeField` have nothing. A form library calls `setDisabledState` on a
`ControlValueAccessor`, and Angular cannot make `Calendar` and `TimeField` form controls without it
(ADR 0015, finding 25; ADR 0020, "Already planned as additions"). The three adapters also need the
same behaviour, so it belongs in the core.

`DayCell.isDisabled` already exists and means "outside `minDate`..`maxDate`". It is about one day;
the new option is about the whole widget. The names stay apart: `disabled` on options and state,
`isDisabled` on a day.

## Decision

1. **Option and state.** `CalendarOptions` and `TimeFieldOptions` get `disabled?: boolean`
   (default `false`; `undefined` means "not set", as for every option). `CalendarState` and
   `TimeFieldState` get `readonly disabled: boolean`. Both are additions: they do not break the
   freeze of ADR 0020.
2. **What it blocks: what the user does.** When `disabled` is true, the handlers returned by the
   prop getters do nothing, and `handleKeyDown` returns `false` without `preventDefault()` (so Tab
   still leaves the widget). That covers clicks, pointer preview, typing, and the arrow keys. It
   also covers the navigation of a calendar: its buttons and keys do not move the month. A
   disabled widget is inert, like a disabled `<input>`.
3. **What it does not block: the application.** The methods (`select`, `setView`, `nextMonth`,
   `increment`, `clear` and the like) and `setOptions` keep working. A form must
   still be able to write a value into a disabled control (`writeValue`), and the application is
   in charge of what it calls. Only the paths that come from a user event are guarded.
4. **Attributes.** Only while `disabled` is true: the root has `aria-disabled="true"` and
   `data-disabled`; the buttons (previous, next, month, year) have `disabled`; the day, month and
   year cells and the time segments have `aria-disabled="true"` and `tabindex="-1"`, so no element
   is in the tab order. The selection stays visible (`aria-selected` and `data-*` do not change).
   When `disabled` is false none of these attributes is present.
5. **Focus.** A disabled widget never bumps `focusRequest`.
6. **Adapters.** React, Angular and Vue get a `disabled` input on `Calendar` and `TimeField`
   that goes to the core. The pickers keep their `disabled` (it disables the input and the toggle)
   and do not need the core option. Angular's `Calendar` and `TimeField` also get a
   `ControlValueAccessor` whose `setDisabledState` sets the option; that is a separate step after
   this one.
7. **Out of scope.** `readOnly` (visible and focusable, not editable) is a different behaviour
   and is not added now.

8. **Which methods count as the user.** `handleKeyDown`, `previewTo` and `focusSegment` exist
   to be called by adapters from DOM events (key, pointer, focus), so they are guarded like the
   handlers; the other methods are the application's. One function wraps the nine prop getters of
   the calendar and makes their result inert while `disabled` is true; the time field marks its
   own elements. The `data-disabled` of a day keeps meaning "outside `minDate`..`maxDate`", so
   only the root gets `data-disabled` for the whole widget.

## Tests

- `disabled: true` at creation, and set later with `setOptions`, and back to `false` or
  `undefined`: the state follows.
- Every handler of every prop getter does nothing, and the value does not change; `handleKeyDown`
  returns `false` and does not call `preventDefault`.
- The methods and `setOptions` with a `value` still change a disabled widget.
- The attributes of decision 4 are there when disabled and absent when not.
- `focusRequest` does not change while disabled.
- Per adapter: the `disabled` input reaches the core (React, Angular, Vue).

## Done when

The tests pass in the core and in the three adapters, `docs/api.md` describes the option, and
the roadmap item is checked.

## Result

Done in the core (`disabled` in the options and the state of `createCalendar` and
`createTimeField`; one `inert` function wraps the nine prop getters of the calendar; 11 tests).
React needed no code, because its components pass every option on (7 tests). Vue has a
`disabled` prop on `Calendar` and `TimeField` (6 tests). Angular has a `disabled` input and a
`ControlValueAccessor` on `CalendrixCalendar` and `CalendrixTimeField`: `writeValue(null)` means
empty (`[]` in `multiple` mode), `setDisabledState` sets the option, and the control is touched
when the focus leaves the whole component (`focusout`, not each cell or segment) (11 tests).

## Alternatives

- **Block the methods too.** Simpler to explain, but then `writeValue` of a disabled form control
  would have to go around the guard.
- **Let the adapters do it** (a wrapper that swallows events). Three implementations of the same
  rule that drift apart; the attributes would differ.
- **`readOnly` instead of `disabled`.** Does not give a form control a disabled state.