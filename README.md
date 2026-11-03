# calendrix

> Accessible date and time picker with first-class **Persian (Jalali)** and Gregorian support. A headless, framework-agnostic core with ready-made components, starting with React.

**Status: pre-alpha.** The core (calendar, selection, keyboard, time field, time zones, text input) and the React adapter are implemented and tested. Angular and Vue adapters and the finance plugin are on the [roadmap](docs/roadmap.md).

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
| `@calendrix/angular`                     | Angular adapter (signals)                             | Planned     |
| `@calendrix/vue`                         | Vue adapter (composable)                              | Planned     |
| `@calendrix/finance`                     | Market calendars and holidays                         | Planned     |

## Repository layout

```
packages/        Publishable packages
apps/demo/       Vite demo app (React)
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
