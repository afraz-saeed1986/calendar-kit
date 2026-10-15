# @calendar-kit/core

Framework-agnostic calendar core. Zero runtime dependencies, no DOM.

> Pre-alpha. See the [roadmap](../../docs/roadmap.md) for what is implemented.

## What is available today

```ts
import { addDays, compareDates, convertDate, createDate, gregory } from '@calendar-kit/core';

const d = createDate('gregory', 2024, 2, 28);

addDays(d, 1); // { system: 'gregory', year: 2024, month: 2, day: 29 }
addDays(d, 2); // { system: 'gregory', year: 2024, month: 3, day: 1 }

gregory.isLeapYear(2100); // false
gregory.daysInMonth(2024, 2); // 29

compareDates(d, addDays(d, 1)); // < 0
```

Converting between systems goes through the epoch day, so it works for any registered calendar:

```ts
import { convertDate, registerCalendar } from '@calendar-kit/core';
// registerCalendar(persian)  // provided by @calendar-kit/persian (planned)
// convertDate(d, 'persian')
```

## API

| Export                                       | Purpose                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `createDate(system, y, m, d)`                | Create a validated `CalendarDate` (throws `RangeError` if impossible) |
| `addDays(date, n)`                           | Add or subtract days across any boundary                              |
| `convertDate(date, system)`                  | Convert to another calendar system                                    |
| `compareDates(a, b)`                         | Ordering, works across systems                                        |
| `isSameDay(a, b)`                            | Equality by day                                                       |
| `gregory`                                    | Gregorian `CalendarImplementation`                                    |
| `registerCalendar(impl)` / `getCalendar(id)` | Calendar registry used by plugins                                     |

Types (`CalendarDate`, `CalendarImplementation`, `CalendarPlugin`, `Selection`, ...) are exported from the package root. The planned `createCalendar` API is described in [docs/api.md](../../docs/api.md).

## Scripts

```bash
pnpm build       # tsup: ESM + CJS + .d.ts
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```
