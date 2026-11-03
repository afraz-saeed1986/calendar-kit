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

## Styling

Components have no styles of their own. Import `@calendrix/react/styles.css` for the default look, then override the variables on `:root` or on any ancestor:

```css
:root {
  --calendrix-accent: #7c3aed;
  --calendrix-radius: 12px;
  --calendrix-cell-size: 3rem;
}
```

Variables: `--calendrix-font`, `-bg`, `-fg`, `-muted`, `-border`, `-hover`, `-accent`, `-accent-fg`, `-danger`, `-radius`, `-cell-size`, `-gap`. Dark mode follows the system; set `data-theme="dark"` or `data-theme="light"` on any element to force a theme inside it. Every part has a `calendrix-*` class, and days carry `data-today`, `data-selected`, `data-outside-month`, `data-disabled` and `data-unavailable`.

## Known limitations

See [ADR 0009](adr/0009-react-adapter.md): the popover does not flip near the viewport edge, has no focus trap, and tapping a time segment on a phone does not open the on-screen keyboard yet.
