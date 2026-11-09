# React

```bash
pnpm add @calendrix/react @calendrix/core
# for the Persian calendar
pnpm add @calendrix/persian
```

Peer dependencies: `react` and `react-dom` 18 or newer.

## DateTimePicker

A text input with a popover. The user can type a date and a time or pick them.

```tsx
import { DateTimePicker } from '@calendrix/react';
import { persianPlugin } from '@calendrix/persian';
import '@calendrix/react/styles.css';

function Example() {
  return (
    <DateTimePicker
      system="persian"
      locale="fa-IR"
      plugins={[persianPlugin]}
      onChange={(value) => console.log(value)} // { date, time } or null
    />
  );
}
```

The value is `{ date, time }`: a `CalendarDate` in any calendar system and a time of day, with no time zone. Use `toInstant(value, 'Asia/Tehran')` when you need a moment, and `formatISODate` for a Gregorian `YYYY-MM-DD` to send to a server. See [time.md](time.md).

| Prop                                                       | Purpose                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `value` / `defaultValue` / `onChange`                      | Controlled (`value`, even `null`) or uncontrolled use                   |
| `system`                                                   | Calendar system shown and understood when typing (default `gregory`)    |
| `locale`                                                   | Names, numerals and the order of a typed date (default `en-US`)         |
| `hourCycle` / `showSeconds`                                | 12 or 24-hour clock, seconds segment                                    |
| `minDate` / `maxDate` / `isDateUnavailable`                | Days that cannot be picked                                              |
| `plugins`                                                  | Calendar systems and day rules; define them once, outside the component |
| `timeZone` / `now`                                         | The clock that decides "today" (inject `now` in tests)                  |
| `labels` / `placeholder` / `disabled` / `id` / `className` | Texts, placeholder, state and hooks for styling                         |

## Calendar and TimeField

The two pieces are available on their own. `<Calendar />` accepts every option of `createCalendar`, and `<TimeField />` every option of `createTimeField`.

```tsx
import { Calendar, TimeField } from '@calendrix/react';

<Calendar locale="en-US" value={date} onChange={setDate} />
<TimeField locale="de-DE" value={time} onChange={setTime} />
```

## Hooks

`useCalendar(options)` returns `{ calendar, state }` and `useTimeField(options)` returns `{ field, state }`. Use them to build your own markup; `toReactProps(calendar.getDayProps(date))` turns the attributes and handlers of a prop getter into React props. Options can be written inline: callbacks, dates and arrays do not cause extra updates.

## Range and multiple selection

`<Calendar />` selects one day by default. The `selection` option changes that, and the type of `value` and `onChange` follows it:

```tsx
<Calendar selection="range" value={range} onChange={setRange} />      // { start, end } | null
<Calendar selection="multiple" value={days} onChange={setDays} />     // CalendarDate[]
```

| Option                    | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `selection`               | `'single'` (default), `'range'` or `'multiple'`                           |
| `allowUnavailableInRange` | Range only: allow a range that contains unavailable days (default `true`) |
| `maxSelected`             | Multiple only: the most days that can be selected                         |

A range takes two clicks. The first click sets the start (nothing is reported yet), the pointer or the arrow keys preview the range, and the second click completes it and calls `onChange` once. If the second day is before the first, the two swap. A click after a complete range starts a new one, and the old value stays until the new range is complete. `Escape` cancels a start that is waiting for its end. With the keyboard, `Enter` or `Space` does what a click does. A multiple selection toggles a day on each click, and `onChange` gets the days from the oldest to the newest; an empty list means that nothing is selected.

Days carry `data-range-start`, `data-range-end`, `data-in-range` (between the ends) and `data-in-preview` (the range that a click would complete). In the hooks, `calendar.previewTo(date)` draws the preview and `calendar.previewTo(null)` removes it. `<DateTimePicker />` supports a single date for now. See [ADR 0011](adr/0011-range-and-multiple-selection.md).

## Several months

`visibleMonths` shows one (default), two or three months side by side, so a range can cross a month boundary with both ends visible. It works in every selection mode.

```tsx
<Calendar selection="range" visibleMonths={2} value={range} onChange={setRange} />
```

The previous and next buttons move by one month. The month and year buttons are in the title of the first month, and the days of the neighbouring months stay empty, so every day appears once. The visible months move only when the keyboard or a button takes the focus out of them. The months and years views show a single panel for the first visible month. The calendar does not decide when there is no room for two months: pass `visibleMonths={1}` on a narrow screen.

In the hooks, `state.grids` lists the visible months (`year`, `month`, `label`, `weeks`), `state.visibleLabel` is one label for all of them, and `calendar.getGridProps(index)` gives the props of one grid. `state.weeks` and `state.monthLabel` keep describing the first month. See [ADR 0012](adr/0012-multiple-visible-months.md).

## Months and years

The month and the year in the header of `<Calendar />` are buttons. A click on the month shows the months of the year, a click on the year shows a page of ten years (with one year on each side). Choosing a cell goes back to the days; it moves the view but does not change the value. The arrows move by a month, a year or ten years, depending on what is shown.

| Key                   | Months and years                                           |
| --------------------- | ---------------------------------------------------------- |
| Arrow keys            | One cell left or right, one row up or down                 |
| `PageUp` / `PageDown` | One year (ten years in the years view)                     |
| `Home` / `End`        | First and last month, or first and last year of the decade |
| `Enter` / `Space`     | Choose the focused cell                                    |
| `Escape`              | Back to the days (in a picker, a second press closes it)   |

With `minDate` and `maxDate`, months and years that have no allowed day are disabled. The same works in the Persian calendar, in right-to-left languages and in the hooks: use `calendar.getMonthButtonProps()`, `getYearButtonProps()`, `getMonthProps(month)` and `getYearProps(year)`. See [ADR 0010](adr/0010-month-year-views.md).

## Styling

Components have no styles of their own. Import `@calendrix/react/styles.css` for the default look, then override the variables on `:root` or on any ancestor:

```css
:root {
  --calendrix-accent: #7c3aed;
  --calendrix-radius: 12px;
  --calendrix-cell-size: 3rem;
}
```

Variables: `--calendrix-font`, `-bg`, `-fg`, `-muted`, `-border`, `-hover`, `-accent`, `-accent-fg`, `-danger`, `-radius`, `-cell-size`, `-gap`. Dark mode follows the system; set `data-theme="dark"` or `data-theme="light"` on any element to force a theme inside it. Every part has a `calendrix-*` class, and days carry `data-today`, `data-selected`, `data-outside-month`, `data-disabled`, `data-unavailable`, `data-range-start`, `data-range-end`, `data-in-range` and `data-in-preview`.

## Props

### `<DateTimePicker/>`

| Prop                                    | Type                                     | Default           | Description                                                                                     |
| --------------------------------------- | ---------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `value`, `defaultValue`                 | `DateTimeValue \| null`                  |                   | Passing `value` (even `null`) makes the picker controlled.                                      |
| `onChange`                              | `(value: DateTimeValue \| null) => void` |                   | Called when the user types or picks a valid date, or clears it.                                 |
| `system`                                | `CalendarSystem`                         | `'gregory'`       | Calendar system shown and understood when typing.                                               |
| `locale`                                | `string`                                 | `'en-US'`         | BCP 47 locale for names, numerals and the order of a typed date.                                |
| `hourCycle`                             | `12 \| 24`                               | locale habit      | Clock style.                                                                                    |
| `showSeconds`                           | `boolean`                                | `false`           | Show a seconds segment.                                                                         |
| `minDate`, `maxDate`                    | `CalendarDate`                           |                   | Dates outside this range cannot be picked.                                                      |
| `isDateUnavailable`                     | `(date) => boolean`                      |                   | Mark days as not selectable.                                                                    |
| `plugins`                               | `CalendarPlugin[]`                       |                   | For example `persianPlugin`.                                                                    |
| `timeZone`, `now`                       | `string`, `() => Date`                   | runtime           | Decide what "today" is. Inject `now` in tests.                                                  |
| `labels`                                | `Partial<PickerLabels>`                  | locale            | Texts of the picker.                                                                            |
| `placeholder`                           | `string`                                 | a sample          | Placeholder of the input.                                                                       |
| `disabled`, `id`, `className`           |                                          |                   | As usual.                                                                                       |
| `portal`                                | `boolean`                                | `true`            | Render the popover in `document.body`. `false` renders it next to the input.                    |

`DateTimePicker` also accepts these options of the calendar and the time field:

- `weekStart` (`0..6`, 0 is Sunday), `direction` (`'ltr' | 'rtl'`) and `visibleMonths` (`1..3`), described under `<Calendar/>` below.
- `hourStep`, `minuteStep` and `secondStep` (default `1`), and `minTime` and `maxTime`, described under `<TimeField/>` below. A date picked before any time is chosen starts at `minTime`, or at midnight when there is none.

### `<DatePicker/>`

A text input and a popover with a calendar, for one day, a range or many days, without a time (see [ADR 0014](adr/0014-date-picker.md)). Use `DateTimePicker` when a time is needed.

```tsx
<DatePicker selection="range" system="persian" locale="fa-IR" plugins={[persianPlugin]} onChange={console.log} />
```

| Prop                                                                                                        | Type                                | Default                  | Description                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `selection`                                                                                                 | `'single' \| 'range' \| 'multiple'` | `'single'`               | One day, a range, or many days. The type of `value` and `onChange` follows it.           |
| `value`, `defaultValue`, `onChange`                                                                         | follows `selection`                 |                          | Passing `value` (even `null`, or `[]` for `multiple`) makes the picker controlled.       |
| `closeOnSelect`                                                                                             | `boolean`                           | `true`, `false` for `multiple` | Close when the selection is complete: a picked day, or the second day of a range.  |
| `visibleMonths`                                                                                             | `number`                            | `2` for `range`, else `1` | How many months the calendar shows.                                                     |
| `allowUnavailableInRange`, `maxSelected`                                                                    |                                     |                          | As in `<Calendar/>`.                                                                     |
| `system`, `locale`, `plugins`, `minDate`, `maxDate`, `isDateUnavailable`, `weekStart`, `direction`, `timeZone`, `now` |                           |                          | As in `<DateTimePicker/>` and `<Calendar/>`.                                             |
| `labels`                                                                                                    | `Partial<PickerLabels> & { datesSelected?: (count: number) => string }` | locale | Texts of the picker. `datesSelected` is the text of a long list of days.       |
| `placeholder`, `disabled`, `id`, `className`, `portal`                                                      |                                     |                          | As in `<DateTimePicker/>`.                                                               |

The text in the input:

- `single`: one date, typed or picked.
- `range`: `11/18/2026 – 11/25/2026`, typed or picked. When typing, the separator can be an en dash or em dash (with or without spaces), a hyphen with spaces around it, or the word `to` (`تا` in Persian, `bis` in German). If the end is before the start, the two are swapped. The same text is available as `formatDateRange` and `parseDateRange` in `@calendrix/core`.
- `multiple`: the input is read-only. It lists the dates when there are at most three, and shows a count (`5 dates`) otherwise. Delete and Backspace clear it, and so does the Clear button.

In all modes, a ✕ button in the field clears the selection when there is one.

Like `Calendar`, the value is in the calendar system on screen. Use `convertDate` to store it in another one.

### `<Calendar/>`

Accepts every option of `createCalendar` (`CalendarOptions<M>`) and `className`. The type of `value`, `defaultValue` and `onChange` follows `selection`.

| Prop                                    | Type                        | Default                | Description                                                                          |
| --------------------------------------- | --------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `selection`                             | `'single' \| 'range' \| 'multiple'` | `'single'`     | One day (`CalendarDate`), a range (`DateRange`) or many days (`CalendarDate[]`).     |
| `value`, `defaultValue`, `onChange`     | follows `selection`         |                        | `null` means controlled with nothing selected; an empty array for `multiple`.        |
| `visibleMonths`                         | `number`                    | `1`                    | 1, 2 or 3 months side by side.                                                       |
| `allowUnavailableInRange`               | `boolean`                   | `true`                 | Range: allow a range that contains unavailable days.                                 |
| `maxSelected`                           | `number`                    | no limit               | Multiple: the most days that can be selected.                                        |
| `system`, `locale`                      | `CalendarSystem`, `string`  | `'gregory'`, `'en-US'` | Calendar system and locale.                                                          |
| `direction`                             | `'ltr' \| 'rtl'`            | from the locale        |                                                                                      |
| `weekStart`                             | `0..6`                      | from the locale        | 0 is Sunday.                                                                         |
| `focusedDate`, `onFocusedDateChange`    | `CalendarDate`              | today                  | The date that decides the visible month.                                             |
| `minDate`, `maxDate`                    | `CalendarDate`              |                        | Dates outside this range are disabled.                                               |
| `isDateUnavailable`                     | `(date) => boolean`         |                        | Mark days as not selectable.                                                         |
| `labels`                                | `Partial<CalendarLabels & ViewLabels>` | locale      | Texts of the buttons.                                                                |
| `timeZone`, `now`                       | `string`, `() => Date`      | runtime                | Decide what "today" is.                                                              |
| `plugins`                               | `CalendarPlugin[]`          |                        | Register calendar systems and decorate days.                                         |
| `className`                             | `string`                    |                        | Added to the root element.                                                           |

### `<TimeField/>`

Accepts every option of `createTimeField` (`TimeFieldOptions`) and `className`.

| Prop                                          | Type                              | Default      | Description                                      |
| --------------------------------------------- | --------------------------------- | ------------ | ------------------------------------------------ |
| `value`, `defaultValue`                       | `TimeValue \| null`               |              | Passing `value` (even `null`) makes it controlled. |
| `onChange`                                    | `(value: TimeValue \| null) => void` |           | Called when the time changes or is emptied.      |
| `locale`                                      | `string`                          | `'en-US'`    | Numerals and the AM/PM text.                     |
| `hourCycle`                                   | `12 \| 24`                        | locale habit | Clock style.                                     |
| `showSeconds`                                 | `boolean`                         | `false`      | Show a seconds segment.                          |
| `hourStep`, `minuteStep`, `secondStep`        | `number`                          | `1`          | Step of the up and down arrows.                  |
| `minTime`, `maxTime`                          | `TimeValue`                       |              | Values outside this range are rejected.          |
| `labels`                                      | `Partial<TimeFieldLabels>`        | English      | Texts spoken by screen readers.                  |
| `className`                                   | `string`                          |              | Added to the root element.                       |

### Hooks and helpers

- `useCalendar(options)` returns `{ calendar, state }` (`UseCalendarResult`); `useTimeField(options)` returns `{ field, state }` (`UseTimeFieldResult`). Use them to build your own markup.
- `toReactProps(props)` turns the `{ attrs, handlers }` of a prop getter into React props.

## Popover

`<DateTimePicker/>` positions its popover with [Floating UI](https://floating-ui.com) (see [ADR 0013](adr/0013-popover-positioning-and-focus.md)):

- It opens below the input and flips above it, or shifts sideways, when there is not enough room. Its size is limited to the space left in the viewport and it scrolls inside.
- It is rendered in `document.body`, so a parent with `overflow: hidden` does not clip it. Pass `portal={false}` to render it next to the input instead.
- Tab and Shift+Tab stay inside the popover. Escape and Done close it and return the focus to the input.
- Set `--calendrix-z-popover` to change its `z-index` (default `1000`).
- A `data-theme` attribute on an ancestor does not reach a portaled popover. Put it on `<html>` or `<body>`, or use `portal={false}`.

## Known limitations

Tapping a time segment on a phone does not open the on-screen keyboard yet.
