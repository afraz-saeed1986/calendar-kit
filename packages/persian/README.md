# @calendrix/persian

Persian (Jalali) calendar system for [calendrix](../../README.md), backed by `Intl`. Requires `@calendrix/core`.

> Pre-alpha. Design notes: [ADR 0004](../../docs/adr/0004-persian-calendar-via-intl.md).

## Usage

```ts
import { addDays, convertDate, createDate, registerCalendar } from '@calendrix/core';
import { persian } from '@calendrix/persian';

registerCalendar(persian);

const nowruz = createDate('gregory', 2026, 3, 21);

convertDate(nowruz, 'persian'); // { system: 'persian', year: 1405, month: 1, day: 1 }

const lastDay = createDate('persian', 1403, 12, 29);
addDays(lastDay, 1); // { system: 'persian', year: 1403, month: 12, day: 30 } (1403 is a leap year)
```

With `createCalendar`, pass the plugin and the locale:

```ts
import { createCalendar } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';

const calendar = createCalendar({ system: 'persian', locale: 'fa-IR', plugins: [persianPlugin] });

calendar.getState().monthLabel; // "مهر ۱۴۰۵" (depends on the current date)
calendar.getState().weekdayLabels[0].long; // "شنبه" (the week starts on Saturday)
calendar.setOptions({ system: 'gregory', locale: 'en-US' }); // same day, other calendar
```

## What you get

| Export          | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `persian`       | The Persian `CalendarImplementation`. Register it before using it |
| `persianPlugin` | The same calendar as a `CalendarPlugin` for `createCalendar`      |

Months 1 to 6 have 31 days, months 7 to 11 have 30 days, and Esfand (month 12) has 29 days, or 30 in a leap year.

## Limitations

- Leap years follow the ICU implementation of the runtime, which can differ from the official calendar in rare years.
- Requires full ICU data (Node 13+, modern browsers).

## Scripts

```bash
pnpm build       # tsup: ESM + CJS + .d.ts
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```
