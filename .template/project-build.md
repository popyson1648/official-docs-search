# Build

## Prerequisites

- Node.js 24, matching CI.
- npm.

## Setup

Run `npm install`.

## Application Commands

- Start the local server with `npm run dev`.
- Build the Astro Node application with `npm run build`.
- Start the production build with `npm start`.
- Use `npm run preview` only for Astro preview, not production delivery verification.

The application has no runtime search-provider key.
The browser fetches only supported bundles matching selected sources and Docs locale.

When fonts are product assets, document whether face declarations and binaries
are local or remote, the exact family/weight contract, the refresh command, and
the visual verification required after a refresh.

## Generated Search Data

Treat `src/data/docs-sources.toml` as the canonical source, locale, and support-status contract.
The manifest projects every support state and is the exact supported index inventory.
Require at least one maintained English index or reviewed replacement for every
catalog language, and add separate Japanese indexes only for actual Japanese editions.
Commit compact, content-addressed bundles, the complete `manifest.json`, and
its deterministic client-only `runtime-manifest.json` projection under
`public/search-index/`.
Record input and output hashes, validators, versions, counts, sizes, attribution,
license, cadence, known queries, and visible English/Japanese qualifications in the
complete manifest. Keep only search selection, ranking, result display,
support-state, bundle validation, and visible qualification fields in the
runtime projection.

- `npm run update:search-index` intentionally refreshes committed artifacts.
- Weekly and monthly update commands refresh only jobs with that cadence.
- `npm run generate:search-index` is the update alias.
- `npm run check:search-index` stages and compares artifacts without changing them.
- `npm run test:live:affected` checks changed source families only.
- `npm run test:live` explicitly checks every source and live result URL.

Allow repeatable source and frequency selectors.
Partial generation must hash-validate and reuse every unselected artifact, and
must fail on catalog, schema, identity, or static-metadata drift.

Validate all adapters before publication.
Use bounded job concurrency without changing catalog manifest order.
Publish content-addressed bundles and the runtime projection first and the
complete manifest last.
Retain retrieval time for unchanged input hashes, and gate large count or compressed-size changes behind explicit review.
Schedule weekly and monthly source cadences separately, avoid a duplicate
network regeneration after update, use scope-specific update branches, create
reviewable draft pull requests, and never merge them.

## Production Delivery

Run `npm run build && npm start`.
Generate maximum-compression gzip and Brotli sidecars for search-index JSON
inside the build output without committing them.
The production server prefers those sidecars, negotiates gzip and Brotli for
other compressible responses, emits content-derived `ETag` and
`Vary: Accept-Encoding`, gives hashed bundles a one-year immutable policy, and
requires revalidation for both manifests.
Derive bundle validators from manifest output hashes so startup does not read every bundle.

## Common Failures

- Reject mismatched catalog and adapter declarations.
- Reject empty, malformed, out-of-scope, or unexpectedly changed input before publication.
- Treat check-mode differences as a prompt to review and intentionally update, not as an automatic repair.
