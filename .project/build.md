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
Every catalog language has at least one supported English index or a reviewed
English replacement source.
Maintained Japanese editions have separate Japanese indexes; Japanese requests
fall back visibly to English for languages without one.
The generated manifest is the exact supported source-and-locale inventory.

Each supported bundle contains compact title, URL-suffix, and optional-section tuples.
Its filename includes the first 16 hexadecimal characters of the output SHA-256.
The manifest records the complete output hash, input URLs and hashes, HTTP validators, retrieval time, adapter and upstream versions, record and compressed sizes, attribution, license URL, cadence, known queries, and visible English/Japanese qualifications where needed.

Use these commands:

- `npm run update:search-index`: fetch, validate, and replace committed artifacts.
- `npm run update:search-index:weekly`: update only weekly source jobs.
- `npm run update:search-index:monthly`: update only monthly source jobs,
  including the rate-limited GNU/GCC group.
- `npm run generate:search-index`: alias of the update command.
- `npm run check:search-index`: generate in staging and compare without changing committed artifacts.
- `npm run test:live:affected`: check only source families affected by the
  current diff and verify their live result links.
- `npm run test:live`: check every source and verify every live result link.

The generator and live verifier also accept repeatable
`--source SOURCE_ID[/LOCALE]`, `--exclude-source`, and
`--frequency weekly|monthly` selectors.
Partial generation verifies and reuses every unselected committed bundle; it
fails if a reused hash, bundle identity, static job metadata, catalog hash, or
schema does not match.

Generation validates every adapter before publishing and runs independent jobs
with bounded concurrency while retaining catalog order in the manifest.
Update mode moves content-addressed bundles out of staging first, moves `manifest.json` last, then removes obsolete JSON files.
If input hashes are unchanged, the prior `retrievedAt` is retained so identical inputs produce identical artifacts.
Record-count and gzip/Brotli-size gates reject large changes; use `node scripts/generate-search-index.mjs --update --accept-large-changes` only after reviewing and approving the upstream change.

The scheduled workflow refreshes weekly sources every Monday and monthly
sources on the first day of each month.
It does not repeat upstream generation immediately after an update; offline
integration checks validate the complete resulting artifact set.
The workflow opens or refreshes a scope-specific branch and draft pull request
so a pending weekly update cannot be overwritten by a monthly or manual run.
It never merges an index update.

## Production Delivery

`npm run build && npm start` runs the Astro middleware build through `scripts/serve-production.mjs`.
For manifest-listed search JSON, the server negotiates gzip level 6 or Brotli quality 5, sets a content-derived weak `ETag`, and sends `Vary: Accept-Encoding`.
Content-addressed bundles use `Cache-Control: public, max-age=31536000, immutable`.
`manifest.json` uses `Cache-Control: no-cache, must-revalidate`.
Missing or unhashed files never receive the immutable policy.
The server derives bundle validators from manifest output hashes instead of
reading every bundle during startup.

## Common Failures

- A supported catalog entry without an adapter, or an adapter without a supported entry, fails generation.
- Empty, malformed, out-of-scope, or unexpectedly smaller input fails before publication.
- `npm run check:search-index` reports missing, changed, or obsolete artifacts without repairing them.
- If an upstream change is intentional, update artifacts, review the manifest and bundle diff, and run complete verification.
