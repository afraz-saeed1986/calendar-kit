# Dates and times as text

Write a date or a time the way a locale does, and read what a user typed. Everything is built on `Intl`, so it works in every registered calendar system.

```ts
import {
  formatDate,
  formatDateTime,
  formatTime,
  parseDate,
  parseDateTime,
  parseTime,
} from '@calendrix/core';

formatDate(createDate('gregory', 2026, 10, 14), 'de-DE'); // "14.10.2026"
formatDate(createDate('persian', 1405, 7, 22), 'fa-IR'); // "۱۴۰۵/۰۷/۲۲"

parseDate('۱۴۰۵/۷/۲۲', { locale: 'fa-IR', system: 'persian' }); // { system: 'persian', year: 1405, month: 7, day: 22 }
parseDate('2026-10-14', { locale: 'en-US' }); // four digits first: always year, month, day
parseDate('1404/12/30', { locale: 'fa-IR', system: 'persian' }); // null: 1404 is not a leap year

formatTime({ hour: 21, minute: 5, second: 0 }, { locale: 'en-US', hourCycle: 12 }); // "09:05 PM"
parseTime('9:05 PM'); // { hour: 21, minute: 5, second: 0 }

parseDateTime('10/14/2026 9:30 PM', { locale: 'en-US' }); // { date, time }
```

Every parser returns `null` for invalid text and never throws, so it is safe to call on every keystroke.

| Function                                              | Purpose                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `formatDate(date, locale?)`                           | Numeric date with the locale's order, separator and numerals, in the date's own calendar |
| `parseDate(text, { locale?, system? })`               | Read a typed date; digits in any script, separators `/ - . ,` or space                   |
| `datePatternOf(locale, system)`                       | `{ order, separator }` of a locale in a calendar system                                  |
| `formatTime(time, { locale?, hourCycle?, seconds? })` | Time with the locale's numerals and AM/PM                                                |
| `parseTime(text)`                                     | Read `H:mm`, `HH:mm:ss`, or a 12-hour time with AM or PM                                 |
| `formatDateTime(value, options?)`                     | Date and time as one text                                                                |
| `parseDateTime(text, options?)`                       | Read a date and time separated by a space or `T`                                         |
| `normalizeDigits(text)`                               | Persian and Arabic-Indic digits to Latin digits                                          |

Design notes: [ADR 0008](adr/0008-text-input.md).
