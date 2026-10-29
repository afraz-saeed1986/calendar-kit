# @calendrix/core

Framework-agnostic calendar core. Zero runtime dependencies, no DOM.

> Pre-alpha. See the [roadmap](../../docs/roadmap.md) for what is implemented.

## Dates

```ts
import { addDays, compareDates, convertDate, createDate, gregory } from '@calendrix/core';

const d = createDate('gregory', 2024, 2, 28);

addDays(d, 1); // { system: 'gregory', year: 2024, month: 2, day: 29 }
addDays(d, 2); // { system: 'gregory', year: 2024, month: 3, day: 1 }

gregory.isLeapYear(2100); // false
gregory.daysInMonth(2024, 2); // 29

compareDates(d, addDays(d, 1)); // < 0
```

Converting between systems goes through the epoch day, so it works for any registered calendar. The Persian calendar comes from [`@calendrix/persian`](../persian):

```ts
import { convertDate, registerCalendar } from '@calendrix/core';
// registerCalendar(persian)
// convertDate(d, 'persian')
```

## Month grid and navigation

`createCalendar` holds the visible month, the selected day and everything needed to render and operate them. It knows nothing about the DOM or a framework.

```ts
import { createCalendar } from '@calendrix/core';

const calendar = createCalendar({ locale: 'en-US' });

const state = calendar.getState();
state.monthLabel; // "October 2026"
state.weekdayLabels; // [{ short: 'Sun', long: 'Sunday' }, ...]
state.weeks; // 6 weeks of 7 DayCell objects (date, label, isToday, isSelected, isOutsideMonth, ...)

const unsubscribe = calendar.subscribe(() => console.log(calendar.getState().monthLabel));
calendar.nextMonth(); // logs "November 2026"
unsubscribe();
```

`getState()` returns the same object until something changes, so it works directly with `useSyncExternalStore`. For tests, pass a fixed clock: `createCalendar({ now: () => new Date('2026-10-14T10:00:00Z'), timeZone: 'UTC' })`. Design notes: [ADR 0005](../../docs/adr/0005-calendar-store-and-clock.md).

## Selection

Use it controlled (you own the value) or uncontrolled (the calendar keeps it):

```ts
// Uncontrolled
const calendar = createCalendar({
  defaultValue: createDate('gregory', 2026, 10, 14),
  onChange: (value) => console.log(value), // a CalendarDate, or null when cleared
});
calendar.select(createDate('gregory', 2026, 10, 20));
calendar.clear();

// Controlled: onChange reports the choice, you pass the new value back
calendar.setOptions({ value: createDate('gregory', 2026, 10, 20) });
```

Days outside `minDate` and `maxDate`, and days marked by `isDateUnavailable` or a plugin, cannot be selected.

## Keyboard and accessibility

`handleKeyDown(event)` implements the ARIA grid keys: arrows move by day and week (reversed left and right in right-to-left languages), Home and End go to the start and end of the week, PageUp and PageDown change the month (with Shift the year), and Enter and Space select. It returns `true` when it handled the key.

The prop getters return the attributes and event handlers to put on elements. `attrs` use DOM attribute names and `handlers` use DOM event names, so any framework can map them:

```ts
const grid = calendar.getGridProps();
for (const [name, value] of Object.entries(grid.attrs)) {
  if (value !== undefined) gridElement.setAttribute(name, String(value));
}
gridElement.addEventListener('keydown', grid.handlers.keydown);

const day = calendar.getDayProps(cell.date); // role, tabindex, aria-selected, aria-label, ...
```

After a keyboard move, an adapter must focus the day whose `tabindex` is `0`. Design notes: [ADR 0006](../../docs/adr/0006-selection-keyboard-props.md).

## API

| Export                                       | Purpose                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `createCalendar(options)`                    | Calendar store: month grid, labels, navigation, selection, keyboard   |
| `createDate(system, y, m, d)`                | Create a validated `CalendarDate` (throws `RangeError` if impossible) |
| `addDays(date, n)`                           | Add or subtract days across any boundary                              |
| `addMonths(date, n)` / `addYears(date, n)`   | Add months or years, clamping the day                                 |
| `convertDate(date, system)`                  | Convert to another calendar system                                    |
| `compareDates(a, b)`                         | Ordering, works across systems                                        |
| `isSameDay(a, b)`                            | Equality by day                                                       |
| `dayOfWeek(date)`                            | 0 = Sunday ... 6 = Saturday                                           |
| `gregory`                                    | Gregorian `CalendarImplementation`                                    |
| `registerCalendar(impl)` / `getCalendar(id)` | Calendar registry used by plugins                                     |

Types (`CalendarDate`, `CalendarOptions`, `CalendarState`, `DayCell`, `Calendar`, `ElementProps`, `KeyEventLike`, `CalendarPlugin`, ...) are exported from the package root. The full API design is in [docs/api.md](../../docs/api.md).

## Scripts

```bash
pnpm build       # tsup: ESM + CJS + .d.ts
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
```
