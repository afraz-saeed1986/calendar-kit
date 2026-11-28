# ADR 0027: A documentation site with live demos

Status: accepted

## Context

M5 of the roadmap asks for a documentation site with live demos for all three frameworks. Today
the documentation is Markdown in `docs/` (the API reference in `docs/api.md`, the ADRs) and the
README. The demos are two large showcase apps: `apps/demo` (React) and `apps/vue-demo` (Vue).
Angular has no demo app.

Three things shape the choice:

- **A live demo must match the code.** A demo that is built from an old version of the library
  makes the site wrong without any error.
- **The three frameworks cannot share one page.** A page built with React can render React
  components, and none of the others. The demos of Vue and Angular need their own build.
- **The packages are not published yet.** A site in another repository would have to use npm
  versions that do not exist until `0.1.0`.

## Decision

1. **The site is an app in this repository: `apps/docs`.** It is `private`, like the other apps,
   so its dependencies never reach a published package. The demos are built from the same
   commit as the library, and CI can build the site, so a change that breaks an example is found
   in the same pull request.
2. **It is built with a documentation framework on Next.js.** The first choice is **Nextra**:
   pages are Markdown or MDX, and navigation, search and a dark theme come with it, so there is
   little to maintain. **Fumadocs** (also on Next.js, with more control and more configuration)
   is the alternative if Nextra does not fit when it is installed. Both support a static export
   (`output: 'export'`) and search that runs in the browser (Pagefind in Nextra, Orama in
   Fumadocs).
3. **The site is a static export.** No server is needed, so any static host works. The base path
   comes from an environment variable, so the same build serves a root domain or a sub-path such
   as GitHub Pages.
4. **Every live demo is a small app in an `iframe`, for all three frameworks.** One mechanism for
   React, Vue and Angular: each demo is a real build with its own bundler and its own CSS, as a
   user would have it, and nothing of one framework leaks into the page of another. React could
   render inline, but then its demo would differ in kind from the other two.
5. **Three demo apps, one set of examples.** `apps/demo` (React), `apps/vue-demo` (Vue) and a new
   `apps/angular-demo` each show one example at a time, chosen by the hash of the URL (for
   example `#date-picker-range`). The list of examples is the same in the three, so a page of the
   site can show the same example in a tab for each framework.
6. **The code beside a demo is the code of the demo.** The snippets in the tabs are taken from
   the example files (imported as raw text), not typed again in Markdown, so they are type-checked
   with the demo and cannot drift from it.
7. **The demos are built with a base path and copied into the site.** Each demo is built with
   its base set to `/demos/<framework>/` (the Angular one with `--base-href`) and its output is
   copied to `apps/docs/public/demos/<framework>/` before the site is built. A Turborepo task
   does this in order.
8. **The language of the site is English,** as the rest of the repository. The Persian and RTL
   examples are among the demos.
9. **CI builds the site** (demos and static export), without publishing it.

## Not decided here

- **Where the site is hosted** (GitHub Pages or another static host) and whether it has its own
  domain. Decision 3 keeps both open.
- **The version of Angular in `apps/angular-demo`.** It follows the peer range of the Angular
  package, which is being widened to include 22 (tested with a fresh project).
- **Versioned documentation and a Persian translation** of the site. Not for `0.1.0`.

## Plan

1. `apps/angular-demo`, and a mode in the three demos that shows one example by hash, with the
   shared list of examples.
2. `apps/docs`: Nextra, a static export, one page with the tabs and the `iframe`.
3. The pages: start, the three pickers, range, time, Persian and RTL, theming, accessibility,
   API, and the ADRs.
4. The Turborepo task for the demos and the site, and the CI job.
5. Hosting, the roadmap tick and the Result section.

## Result

The site is in `apps/docs` and CI builds it. It differs from the decisions above in these ways, and
some parts are not done.

**As decided**

- Nextra 4 on Next.js 15 and React 19 worked, so Fumadocs was not needed. The site is a static
  export (`output: 'export'`), the base path comes from `DOCS_BASE_PATH`, and Pagefind builds the
  search index in `postbuild`.
- Every live demo is an `iframe` of a real build, for all three frameworks. `apps/angular-demo` is
  new and uses Angular 22. The three demos share one list of examples, chosen by the URL hash.
- CI has a separate `docs` job that builds the demos and the site. It does not publish anything.

**Different from the decisions**

- Decision 7: the demos are built with a relative base (`--base ./` for Vite, `--base-href ./`
  for Angular), not `/demos/<framework>/`, so the same build works under any base path. A script
  copies them (`pnpm --filter @calendrix/docs demos`, `apps/docs/scripts/copy-demos.mjs`). It is
  not a Turborepo task, because it runs Turborepo itself to build the packages first. The root
  `build` skips the site (`--filter=!@calendrix/docs`), and the `docs` job runs the script and then
  the site build.
- The theme of a demo follows the site. The page sends the theme with `postMessage` (same origin),
  and each demo sets `data-theme` and the colour scheme. Iframes have a fixed height, because
  resizing them by their content was fragile.
- Range, multiple selection and time are sections of the pages of the pickers, not pages of
  their own.

**Found on the way**

- `zod` 4.6.6 breaks the layout of the Nextra theme ("expected nonoptional ... at children"). It is
  pinned to 4.1.12 with `pnpm.overrides` in the root `package.json`. Newer pnpm versions read
  overrides from `pnpm-workspace.yaml` instead, so this must be checked when pnpm is updated.
- Nextra gives `[""]` as the static parameter of the home page, and Next.js expects `[]` for the
  root of an optional catch-all route. `generateStaticParams` filters the empty segment.
- Building the demos from packed tarballs showed that Vue and Angular need
  `@floating-ui/dom`. It moved from a peer dependency to a dependency in both packages (with
  `allowedNonPeerDependencies` for ng-packagr).

**Not done**

- Decision 6: the snippets in the pages are written in the MDX files, not imported from the demo
  sources. They can drift from the demos.
- The API reference and the ADRs are in the site. `apps/docs/scripts/copy-docs.mjs` copies
  `docs/api.md` and `docs/adr/*.md` into `content/` before `dev` and `build`. The copies are ignored
  by git, so the Markdown in `docs/` is the only source. Links between ADRs point to the site, and
  links to other Markdown files become plain text. The other files of `docs/` (the guides for React
  and the text input, the architecture, the roadmap) are not in the site.
- Hosting is not decided.
- The widened Angular peer range (`^21.2.0 || ^22.0.0`): the Angular demo works on 22, but the
  library tests were not run on it.
