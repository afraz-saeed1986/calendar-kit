# calendrix

> Accessible date and time picker with first-class **Persian (Jalali)** and Gregorian support. A headless, framework-agnostic core with ready-made components for React, Vue and Angular.

**Status: pre-alpha.** The core (calendar, selection, keyboard, time field, time zones, text input), the Persian calendar and the React, Vue and Angular adapters are implemented and tested. The finance plugin is on the [roadmap](docs/roadmap.md).

```tsx
import { DateTimePicker } from '@calendrix/react';
import { persianPlugin } from '@calendrix/persian';
import '@calendrix/react/styles.css';

<DateTimePicker system="persian" locale="fa-IR" plugins={[persianPlugin]} onChange={console.log} />;
```

## Why another date picker?

Most date pickers ship UI tied to one framework and treat Persian as an afterthought. calendrix separates **logic** from **rendering**:

- **One core, many frameworks.** All logic (dates, calendars, selection, keyboard navigation, ARIA state, time input, text parsing) lives in a dependency-free TypeScript package. React, Angular and Vue adapters are thin layers over it.
- **Persian and Gregorian, typed or picked.** Dates convert through a single epoch-day pivot. Users can type `۱۴۰۵/۷/۲۲` or `2026-10-14 9:30 PM` and get the same result.
- **RTL and i18n done properly.** Direction, numerals, week start and 12 or 24-hour clocks come from the locale, built on `Intl` instead of a heavy date library.
- **Accessible by design.** The ARIA grid pattern, spinbutton time segments and keyboard navigation are part of the core, so every adapter gets them for free.
- **Honest about time zones.** The picked value is a wall-clock `{ date, time }`. Converting it to a moment (`toInstant`) is explicit and handles daylight saving changes.
- **Finance-aware (planned).** Market calendars, holidays and "next business day" via an opt-in plugin.

## Packages

| Package                                  | Description                                           | Status      |
| ---------------------------------------- | ----------------------------------------------------- | ----------- |
| [`@calendrix/core`](packages/core)       | Dates, calendars, selection, time field, text parsing | Implemented |
| [`@calendrix/persian`](packages/persian) | Persian (Jalali) calendar                             | Implemented |
| [`@calendrix/react`](packages/react)     | `DateTimePicker`, `Calendar`, `TimeField`, hooks      | Implemented |
| `@calendrix/angular`                     | Angular adapter (signals)                             | Implemented |
| `@calendrix/vue`                         | Vue adapter (composable)                              | Implemented |
| `@calendrix/finance`                     | Market calendars and holidays                         | Planned     |

## Size

Sizes of the built code, minified with esbuild, then compressed. `pnpm size` measures them again.

| Package (entry file) | minified |    gzip |  brotli |
| -------------------- | -------: | ------: | ------: |
| `@calendrix/core`    |  32.1 kB | 11.2 kB | 10.3 kB |
| `@calendrix/react`   |  18.1 kB |  6.0 kB |  5.4 kB |
| `@calendrix/vue`     |  25.1 kB |  7.2 kB |  6.3 kB |
| `@calendrix/angular` |  81.4 kB | 10.4 kB |  8.6 kB |
| `styles.css`         |   9.0 kB |  2.0 kB |  1.7 kB |

What an application adds when it imports only some exports (the framework itself is not counted; `@calendrix/core` and Floating UI are):

| Import                 | minified |    gzip |  brotli |
| ---------------------- | -------: | ------: | ------: |
| `createTimeField`      |   6.4 kB |  3.0 kB |  2.7 kB |
| `createCalendar`       |  17.8 kB |  6.4 kB |  5.9 kB |
| React `Calendar`       |  23.3 kB |  8.3 kB |  7.7 kB |
| React `DatePicker`     |  52.6 kB | 19.2 kB | 17.3 kB |
| React `DateTimePicker` |  61.5 kB | 22.2 kB | 19.9 kB |
| Vue `DatePicker`       |  53.3 kB | 19.0 kB | 17.3 kB |
| Vue `DateTimePicker`   |  64.0 kB | 22.2 kB | 20.0 kB |
| `@calendrix/persian`   |   1.2 kB |  0.7 kB |  0.6 kB |

The Angular row is the library file alone: Angular, `@calendrix/core` and Floating UI are not in it, and the Angular build tools remove what an application does not use.

## Performance

Measured with `pnpm bench` on an Intel Core i5-8400 (2.8 GHz) with Node 24. It measures the core, which does the work behind every adapter: no DOM and no framework. A `getState()` builds everything an adapter renders from: the days, and the months and years views.

| Operation                                         |         per second |          time |
| ------------------------------------------------- | -----------------: | ------------: |
| `createCalendar` + `getState`, Gregorian, 1 month |              7,800 |        128 µs |
| `createCalendar` + `getState`, Persian, 1 month   |              8,000 |        125 µs |
| `createCalendar` + `getState`, Persian, 3 months  |              5,200 |        193 µs |
| `nextMonth` + `getState`, Persian                 |              9,900 |        101 µs |
| Select a day + `getState`, Gregorian              |             10,000 |        100 µs |
| `formatDate`, en-US / fa-IR                       |            115,000 |        8.7 µs |
| `parseDate`, en-US / fa-IR                        | 0.8 to 1.2 million | 0.8 to 1.2 µs |
| `convertDate`, Gregorian to Persian               |         13 million |       0.08 µs |
| `createTimeField` + typing `1430`                 |             16,600 |         60 µs |

A state takes about a tenth of a millisecond, so the core is far below the time of one frame (16 ms). The Persian calendar costs the same as the Gregorian one: Intl is asked once for the first day of a year, and the rest is arithmetic, checked against Intl for every day from 1200 to 1500 AP. The time a framework needs to render the result is not part of these numbers.

## Repository layout

```
packages/        Publishable packages
apps/demo/       Vite demo app (React)
apps/vue-demo/   Vite demo app (Vue)
apps/angular-demo/  Angular demo app
apps/docs/       Documentation site (Nextra)
docs/            Architecture, API design, ADRs, roadmap
```

## Getting started (development)

Requirements: Node 20+ and [pnpm](https://pnpm.io) 9.

```bash
pnpm install
pnpm build       # build all packages (the demo reads the built packages)
pnpm test        # run all tests
pnpm typecheck   # TypeScript checks
pnpm lint        # ESLint
pnpm --filter @calendrix/demo dev   # open the demo in the browser
```

## Documentation

- [React guide](docs/react.md): components, hooks and styling
- [Time, time zones and the time field](docs/time.md)
- [Dates and times as text](docs/text-input.md)
- [Architecture](docs/architecture.md): how the core and adapters fit together
- [API design](docs/api.md): the core API (design draft)
- [Architecture decision records](docs/adr): why things are the way they are
- [Roadmap](docs/roadmap.md): milestones and open questions
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
