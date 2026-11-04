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

## Known limitations

See [ADR 0009](adr/0009-react-adapter.md): the popover does not flip near the viewport edge, has no focus trap, and tapping a time segment on a phone does not open the on-screen keyboard yet.
