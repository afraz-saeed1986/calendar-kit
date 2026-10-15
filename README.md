# calendar-kit

> Headless, framework-agnostic calendar toolkit with first-class **Persian (Jalali)** and **Gregorian** support, built for accessibility and, later, financial market calendars.

**Status: pre-alpha.** The core types and the Gregorian calendar are implemented and tested. The calendar state machine (`createCalendar`), framework adapters and the Persian calendar are on the [roadmap](docs/roadmap.md).

> `@calendar-kit/*` is a working name and will be replaced before the first release.

## Why another calendar?

Most date pickers ship UI tied to one framework. calendar-kit separates **logic** from **rendering**:

- **One core, many frameworks.** All logic (dates, calendars, selection, keyboard navigation, ARIA state) lives in a dependency-free TypeScript package. React, Angular and Vue adapters are thin layers over it.
- **Multiple calendar systems.** Gregorian, Persian and Islamic through a small `CalendarImplementation` contract, built on `Intl` instead of a heavy date library.
- **RTL and i18n done properly.** Direction, numerals and week start come from the locale.
- **Accessible by design.** The ARIA grid pattern and keyboard navigation are part of the core, so every adapter gets them for free.
- **Finance-aware (planned).** Market calendars, holidays and "next business day" via an opt-in plugin.

## Packages

| Package                               | Description                    | Status                |
| ------------------------------------- | ------------------------------ | --------------------- |
| [`@calendar-kit/core`](packages/core) | Dates, calendar systems, types | Gregorian implemented |
| `@calendar-kit/persian`               | Persian (Jalali) calendar      | Planned               |
| `@calendar-kit/react`                 | React adapter (`useCalendar`)  | Planned               |
| `@calendar-kit/angular`               | Angular adapter (signals)      | Planned               |
| `@calendar-kit/vue`                   | Vue adapter (composable)       | Planned               |
| `@calendar-kit/finance`               | Market calendars and holidays  | Planned               |

## Repository layout

```
packages/        Publishable packages
apps/            Documentation site and demos (planned)
docs/            Architecture, API design, ADRs, roadmap
```

## Getting started (development)

Requirements: Node 20+ and [pnpm](https://pnpm.io) 9.

```bash
pnpm install
pnpm test        # run all tests
pnpm typecheck   # TypeScript checks
pnpm build       # build all packages
pnpm lint        # ESLint
```

## Documentation

- [Architecture](docs/architecture.md): how the core and adapters fit together
- [API design](docs/api.md): the planned public API (design draft, written in Persian)
- [Architecture decision records](docs/adr): why things are the way they are
- [Roadmap](docs/roadmap.md): milestones and open questions
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
