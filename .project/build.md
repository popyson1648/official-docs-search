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
- Use `npm run preview` only for Astro preview; it does not exercise the custom production delivery contract.

The build does not call a paid search API and needs no public search-provider key.
The browser fetches only supported bundles matching the selected sources and Docs locale.

## Generated Search Data

`src/data/docs-sources.toml` is the canonical source, locale, and support-status contract.
The generated manifest projects all `supported`, `planned`, `blocked`, and `disabled` entries.
The 13 supported indexes are Python EN/JA, Rust EN, ECMAScript EN, MDN JavaScript EN, TypeScript EN, Go standard library EN, Java EN, C# EN, PHP EN/JA, and Ruby EN/JA.

Each supported bundle contains compact title, URL-suffix, and optional-section tuples.
Its filename includes the first 16 hexadecimal characters of the output SHA-256.
The manifest records the complete output hash, input URLs and hashes, HTTP validators, retrieval time, adapter and upstream versions, record and compressed sizes, attribution, license URL, cadence, and known queries.

Use these commands:

- `npm run update:search-index`: fetch, validate, and replace committed artifacts.
- `npm run generate:search-index`: alias of the update command.
- `npm run check:search-index`: generate in staging and compare without changing committed artifacts.
- `npm run test:live`: run the non-mutating check, verify live result links, and run integration tests.

Generation validates every adapter before publishing.
Update mode moves content-addressed bundles out of staging first, moves `manifest.json` last, then removes obsolete JSON files.
If input hashes are unchanged, the prior `retrievedAt` is retained so identical inputs produce identical artifacts.
Record-count and gzip/Brotli-size gates reject large changes; use `node scripts/generate-search-index.mjs --update --accept-large-changes` only after reviewing and approving the upstream change.

The weekly workflow in `.github/workflows/update-search-index.yml` opens or refreshes a draft pull request.
It never merges an index update.

## Production Delivery

`npm run build && npm start` runs the Astro middleware build through `scripts/serve-production.mjs`.
For manifest-listed search JSON, the server negotiates gzip level 6 or Brotli quality 5, sets a content-derived weak `ETag`, and sends `Vary: Accept-Encoding`.
Content-addressed bundles use `Cache-Control: public, max-age=31536000, immutable`.
`manifest.json` uses `Cache-Control: no-cache, must-revalidate`.
Missing or unhashed files never receive the immutable policy.

## Common Failures

- A supported catalog entry without an adapter, or an adapter without a supported entry, fails generation.
- Empty, malformed, out-of-scope, or unexpectedly smaller input fails before publication.
- `npm run check:search-index` reports missing, changed, or obsolete artifacts without repairing them.
- If an upstream change is intentional, update artifacts, review the manifest and bundle diff, and run complete verification.
