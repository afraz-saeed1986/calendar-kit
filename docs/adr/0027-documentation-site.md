# ADR 0027: A documentation site with live demos

Status: proposed

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
- **The source of the API reference:** the existing `docs/api.md` copied or linked into the site,
  or generated from the types. One source, not two, is the aim.
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