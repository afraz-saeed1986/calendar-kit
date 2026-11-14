# ADR 0018: Angular forms integration

- Status: accepted
- Date: 2026-11-14

## Context

`ngModel`, `formControl` and `formControlName` need a `ControlValueAccessor`. Without it the pickers cannot be used in a form without wiring the value by hand (`[(value)]` plus `setValue`).

## Decision

`CalendrixDatePicker` and `CalendrixDateTimePicker` provide `NG_VALUE_ACCESSOR` and implement `ControlValueAccessor`. The form value is the same as `value`: `CalendarDate | null`, `DateRange | null` or `CalendarDate[]` for `DatePicker` (by `selection`), and `DateTimeValue | null` for `DateTimePicker`.

- **`writeValue`**: sets the `value` model. `null` or `undefined` (a reset, a new control) means empty (`[]` for `multiple`). It never calls the form back, so a value written by the form does not mark the control dirty.
- **`onChange`**: called only for a change made by the user (typing, a pick, Clear), never for `writeValue`.
- **`onTouched`**: when the input loses the focus while the popover is closed, and when the popover closes. Moving the focus into the popover is not "touched".
- **`setDisabledState`**: combined with the `disabled` input: the picker is disabled when either is true.
- **Validation**: the form uses its own validators. `Validators.required` works, because an empty value is `null` (or `[]`). Validators for `minDate`, `maxDate` and unavailable days are a separate step (typed dates are not checked against them yet).

`@angular/forms` becomes a peer dependency of `@calendrix/angular`.

`Calendar` and `TimeField` are not value accessors yet: the core has no `disabled` option, and `disable()` would not be shown.

## Consequences

- `[(value)]` keeps working next to a form control (they share the model).
- A user who does not use forms still needs `@angular/forms` installed (the component imports it).