# @calendrix/core

Framework-agnostic calendar core. Zero runtime dependencies, no DOM.

> Pre-alpha. See the [roadmap](../../docs/roadmap.md) for what is implemented.

## What is available today

```ts
import { addDays, compareDates, convertDate, createDate, gregory } from '@calendrix/core';

const d = createDate('gregory', 2024, 2, 28);

addDays(d, 1); // { system: 'gregory', year: 2024, month: 2, day: 29 }
addDays(d, 2); // { system: 'gregory', year: 2024, month: 3, day: 1 }

gregory.isLeapYear(2100); // false
gregory.daysInMonth(2024, 2); // 29

compareDates(d, addDays(d, 1)); // < 0
```

Converting between systems goes through the epoch day, so it works for any registered calendar:

```ts
import { convertDate, registerCalendar } from '@calendrix/core';
// registerCalendar(persian)  // provided by @calendrix/persian (planned)
// convertDate(d, 'persian')
```

`createCalendar` holds the visible month and everything needed to render it. It knows nothing about the DOM or a framework.
import { createCalendar } from '@calendrix/core';

    const calendar = createCalendar({ locale: 'en-US' });

    const state = calendar.getState();
    state.monthLabel; // "October 2026"
    state.weekdayLabels; // [{ short: 'Sun', long: 'Sunday' }, ...]
    state.weeks; // 6 weeks of 7 DayCell objects (date, label, isToday, isOutsideMonth, ...)

    const unsubscribe = calendar.subscribe(() => console.log(calendar.getState().monthLabel));
    calendar.nextMonth(); // logs "November 2026"
    unsubscribe();

    `getState()` returns the same object until something changes, so it works directly with `useSyncExternalStore`. For tests, pass a fixed clock: `createCalendar({ now: () => new Date('2026-10-14T10:00:00Z'), timeZone: 'UTC' })`. Design notes: [ADR 0005](../../docs/adr/0005-calendar-store-and-clock.md).

## API

| Export                                       | Purpose                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `createDate(system, y, m, d)`                | Create a validated `CalendarDate` (throws `RangeError` if impossible) |
| `addDays(date, n)`                           | Add or subtract days across any boundary                              |
| `convertDate(date, system)`                  | Convert to another calendar system                                    |
| `compareDates(a, b)`                         | Ordering, works across systems                                        |
| `isSameDay(a, b)`                            | Equality by day                                                       |
| `createCalendar(options)`                    | Calendar store: month grid, labels, navigation                        |
| `addMonths(date, n)` / `addYears(date, n)`   | Add months or years, clamping the day                                 |
| `dayOfWeek(date)`                            | 0 = Sunday ... 6 = Saturday                                           |
| `gregory`                                    | Gregorian `CalendarImplementation`                                    |
| `registerCalendar(impl)` / `getCalendar(id)` | Calendar registry used by plugins                                     |

Types (`CalendarDate`, `CalendarImplementation`, `CalendarPlugin`, `Selection`, ...) are exported from the package root. The planned `createCalendar` API is described in [docs/api.md](../../docs/api.md).

## Scripts

```bash
pnpm build       # tsup: ESM + CJS + .d.ts
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```
