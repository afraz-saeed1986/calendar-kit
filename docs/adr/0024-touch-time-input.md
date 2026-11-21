# ADR 0024: Typing a time with an on-screen keyboard

Status: accepted

## Context

A `TimeField` is made of segments (hour, minute, optional seconds, AM/PM). Each segment is a
`span` with `role="spinbutton"`, and the user types digits with the keyboard (`handleKeyDown`, ADR
0019). On a phone or a tablet this does not work: tapping a segment focuses it, but no on-screen
keyboard opens, because a browser opens one only for an element the user can edit. The attribute
`inputmode="numeric"` that `getSegmentProps` already sets does nothing on a `span`. Where a
keyboard does exist, Android keyboards often send `keydown` with `key: "Unidentified"`, so
`handleKeyDown` cannot read the digit either. The field is usable on touch only with the arrows of
a physical keyboard. The roadmap lists "Touch time input" (M4).

## Decision

1. **A segment is editable.** `getSegmentProps` adds `contenteditable="true"` (not when the field
   is `disabled`), together with `inputmode="numeric"` (already there, not for the period),
   `enterkeyhint="next"`, `autocapitalize="off"`, `autocorrect="off"` and `spellcheck="false"`.
   This is the approach of React Aria and Adobe's date field. The other options were a hidden
   `<input>` over the field, which fights the segment focus and the screen reader, and a native
   `<input type="time">` on touch devices, which loses the Persian digits and the segments.
2. **The browser never changes the text.** The core gets `handleBeforeInput(type, event)` and a
   handler `beforeinput` in `getSegmentProps`. `event` is `InputEventLike`: `{ inputType, data?,
   preventDefault() }`. For `insertText` and `insertFromPaste` each character of `data` goes
   through the same path as a key (digits in Latin, Persian or Arabic-Indic form, and `a`/`p` for
   the period); `deleteContentBackward` and `deleteContentForward` act like Backspace and Delete.
   It calls `preventDefault()` when it handles the input and returns `true`; the segment text is
   always rendered from the state, never from the DOM. Both are additions (ADR 0020).
3. **`keydown` stays.** Arrows, Home, End and the keys of a physical keyboard are handled by
   `handleKeyDown` as before. A key that `handleKeyDown` handles calls `preventDefault()`, so
   `beforeinput` does not follow; a digit is never typed twice.
4. **Composition.** `insertCompositionText` cannot be cancelled. The adapters listen to `input`
   as well and, when the event is not cancelled (`isComposing`), write the text of the segment
   back from the state. A keyboard that composes digits is rare, and this keeps the DOM equal to
   the state.
5. **The caret and the selection.** A segment shows no caret (`caret-color: transparent` in
   `styles.css`) and allows selecting text where iOS needs it (`-webkit-user-select: text`). The
   segment stays a `spinbutton` with the same `aria-*`.
6. **Moving on.** When a typed digit completes a segment, `focusRequest` grows and the adapter
   focuses the next segment, as for the physical keyboard (ADR 0019). The focus moves while
   handling a user event, which keeps the keyboard open on iOS and Android.
7. **React needs a native listener.** `onBeforeInput` in React is a synthetic event built from
   `textInput` and `keypress`; it does not fire for deletions and not reliably for Android
   keyboards. The React adapter attaches the native `beforeinput` listener to the segment with a
   ref. Vue (`onBeforeinput`) and Angular (`addEventListener` in `props-directive`) use the native
   event already. React also needs `suppressContentEditableWarning`, because the segment holds
   text that React renders.

## Not decided here

- **Screen readers.** A `contenteditable` element with `role="spinbutton"` may be announced as a
  text field by some screen readers. It is tested with the screen-reader pass on the roadmap, and
  the answer goes into this ADR.
- **Real devices.** jsdom has `beforeinput`, so the tests send `InputEvent` and check the state;
  they cannot prove that an on-screen keyboard opens or stays open. That is checked by hand on an
  Android phone and an iPhone and written in the Result section.

## Plan

1. Core: `handleBeforeInput`, the new attributes, tests.
2. React, Vue, Angular, one by one, with tests.
3. `styles.css`, `docs/api.md`, the roadmap, the Result section.


## Result

Done in the core and in all three adapters, in this order: core, React, Vue, Angular.

- **Core:** `handleBeforeInput`, `InputEventLike`, the new attributes and the `beforeinput` handler of `getSegmentProps`. 11 new tests.
- **React:** `toReactProps` spells the new attributes the React way and leaves `beforeinput` out; `TimeField` listens to the native event on its root. 6 new tests.
- **Vue:** `@beforeinput` and `@input` in `TimeField.vue`. 6 new tests (79 in the package).
- **Angular:** `(beforeinput)` and `(input)` in `CalendrixTimeField`. 6 new tests (72 in the library).
- **Styles:** `styles.css` hides the caret and the selection of an editable segment.
- **By hand:** checked on a real phone. The numeric keyboard opens, a typed digit fills the segment, the focus moves to the next segment and the keyboard stays open, and Backspace clears.

Still open: the screen-reader pass (see "Not decided here"). The answer is added here when it is done.