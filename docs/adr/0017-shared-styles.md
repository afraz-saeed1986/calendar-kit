# ADR 0017: One source for the base styles

- Status: accepted
- Date: 2026-11-14

## Context

`styles.css` (the optional base look: variables, dark mode, RTL, forced colors) lives in `packages/react/src`. The Angular adapter has no stylesheet of its own: its demo reads the React file through a relative path. The Vue adapter will need the same file. The class names and `data-*` attributes come from the core, so the CSS is the same for every adapter (ADR 0015, question 8).

## Decision
In the Angular adapter, `ng-packagr` refuses `assets` from outside the library and empties `dist` on each build, so a small script (`scripts/copy-styles.mjs`) copies the file after `ng build`. The React adapter does the same in its `tsup` `onSuccess` step.

The only copy is `packages/styles/styles.css`, in a private workspace package (`@calendrix/styles`, never published). Each adapter copies it into its own build output, so a user gets the file from the adapter package they already install:

- `@calendrix/react/styles.css` (unchanged for users)
- `@calendrix/angular/styles.css`
- later `@calendrix/vue/styles.css`

Each adapter lists `@calendrix/styles` as a `devDependency` (`workspace:^`), so Turborepo includes the stylesheet in the hash of the adapter's `build` task and does not serve a stale cache after a style change.

## Why not the alternatives

- A published `@calendrix/styles` package: one more package to install and to keep in step with the adapters.
- The file inside `@calendrix/core`: no extra package, but the headless core would carry CSS.

## Consequences

- A style change is made in one place and appears in every adapter after its next build.
- Each adapter package is a little bigger (one copy of a small file).
- The demo apps read the file the way a user does, from the built adapter.