# Decision

## Title

Upgrade Astro and the Node adapter and keep no production dependency advisories

## Date

2026-07-23

## Status

Accepted

## Decision

Upgrade Astro and `@astrojs/node` together to compatible supported releases and
require `npm audit --omit=dev` to report no vulnerabilities.
Update vulnerable transitive dependencies through reviewed lockfile changes.
Do not use `npm audit fix --force`.

Test the production middleware output through the repository's Node server in
addition to the development server.
Keep all query, catalog, locale, title, and URL rendering on escaping or
`textContent` boundaries, and reject non-HTTPS result URLs at ingestion and in
the browser.

## Context

The production dependency audit initially reported six advisories:

- Astro transition-property, spread-attribute-name, and hydrated-island XSS
  advisories.
- An `@astrojs/node` trailing-slash redirect advisory for backslash-prefixed
  paths.
- A Windows development-server file-read advisory in esbuild.
- Image-processing advisories inherited through sharp.
- YAML merge-chain denial of service in js-yaml.
- Incomplete executable-script removal in SVGO.

The Node adapter handles production HTTP requests, so its redirect advisory was
reachable.
The application did not use View Transitions, hydrated islands, dynamic spread
attribute names, `astro:assets`, user-provided images, YAML input, or SVG
optimization.
The esbuild advisory affected a Windows development-server path, while this
project is built and deployed through Linux.
Those unused paths reduced immediate exposure but did not justify retaining
known vulnerable production dependencies.

## Alternatives

- Keep Astro 6 and document mitigations: rejected because High advisories would
  remain and the supported fix requires a compatible major upgrade.
- Run `npm audit fix --force`: rejected because it obscures the intended Astro
  and adapter compatibility change among unrelated dependency rewrites.
- Ignore build-time-only advisories: rejected because the production dependency
  graph and CI inputs should still be reviewable and advisory-free.

## Reason

Astro's official v7 migration guide supports upgrading Astro and official
integrations together.
The project does not depend on removed Astro v7 APIs, and its type, build, unit,
integration, production-server, and browser tests pass on Astro 7 and
`@astrojs/node` 11.
An advisory-free production graph is simpler to verify than maintaining several
reachability exceptions.

## Consequences

- The project requires the Node version supported by Astro 7.
- Dependency updates must include the production-server smoke test.
- `npm audit --omit=dev` is a required completion check.
- Escaping regressions are tested even when the original framework advisory path
  is not used by the application.

## Revisit Conditions

- A new production advisory is reported.
- Astro or the Node adapter changes its supported Node versions or standalone
  runtime contract.
- The application adopts View Transitions, hydrated islands, image processing,
  YAML input, or SVG optimization.
