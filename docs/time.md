# Time, date-time values and the time field

A time of day is `{ hour, minute, second }` on a 24-hour clock. A date and time together is `{ date, time }`. The value has no time zone, so it means what the user typed; convert it to a moment explicitly:

```ts
import { createDate, fromInstant, toInstant } from '@calendrix/core';

const value = {
  date: createDate('gregory', 2026, 10, 14),
  time: { hour: 12, minute: 0, second: 0 },
};

toInstant(value, 'Asia/Tehran').toISOString(); // "2026-10-14T08:30:00.000Z"
fromInstant(new Date('2026-10-14T08:30:00Z'), 'Asia/Tehran'); // { date: ..., time: { hour: 12, ... } }
```

Around daylight saving changes a missing wall time moves forward and a repeated one gives the first instant.

## ISO helpers

For forms and servers use `formatISODate` (always Gregorian), `parseISODate`, `formatISOTime` and `parseISOTime`. The parsers return `null` for invalid input.

## The time field

`createTimeField` is the time input: segments (hour, minute, optional seconds, AM/PM) with typing, arrow keys and ARIA spinbutton props.

```ts
import { createTimeField } from '@calendrix/core';

const field = createTimeField({ locale: 'fa-IR', onChange: (time) => console.log(time) });

field.getState().segments; // [{ type: 'hour', text: '--', isPlaceholder: true, ... }, ...]
field.getSegmentProps('hour'); // { attrs: { role: 'spinbutton', ... }, handlers: { keydown, focus } }
field.increment('hour', 1); // the empty field becomes 00:00, then steps
```

When typing completes a segment, `activeSegment` moves to the next one; the adapter must focus that element.

Design notes: [ADR 0007](adr/0007-time-model.md).
