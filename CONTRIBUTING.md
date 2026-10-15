# Contributing

Thanks for your interest in calendrix. This guide keeps contributions consistent and easy to review.

## Setup

```bash
nvm use          # Node 20 (see .nvmrc)
corepack enable  # provides the pinned pnpm version
pnpm install
```

## Workflow

1. Create a branch from `main`: `feat/<topic>`, `fix/<topic>` or `docs/<topic>`.
2. Make a focused change. One concern per pull request.
3. Run the checks locally before pushing:

```bash
   pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
```

4. Open a pull request and describe **what** changed and **why**.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `feat(core): add range selection`, `fix(react): stale focus after navigation`, `docs: clarify plugin contract`.

## Rules for the core package

The core is the contract every adapter depends on, so it is held to a stricter standard:

- **Zero runtime dependencies.**
- **No DOM, no framework imports.** Anything touching the DOM belongs in an adapter.
- **Pure and deterministic.** Inject "now" and time zone instead of reading globals, so tests are repeatable.
- **Every behavior has a test.** Date logic needs boundary cases: leap days, month ends, year changes.
- **Public API changes need an ADR** in `docs/adr/` (copy the template from an existing record).

## Tests

Tests use [Vitest](https://vitest.dev) and live next to the package in `tests/`. Prefer many small, table-driven tests over a few large ones.

## Documentation

If a change affects behavior or the public API, update the relevant file in `docs/` and the package README in the same pull request.
