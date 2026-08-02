# Build

## Prerequisites

- Node.js 24, matching CI.
- npm.

## Setup

Run `npm install`.

## Application Commands

- Start the local server with `npm run dev`.
- Build the Astro Cloudflare Workers application with `npm run build`.
- Start the workerd-based production preview with `npm start`.
- Validate the deploy bundle without publishing with `npm run check:worker`.
- Validate generated runtime types with `npm run generate:worker-types` after a
  Wrangler compatibility or binding change. They stay in ignored `.wrangler/`
  because this application does not author a Worker handler directly and the
  Cloudflare runtime globals would conflict with browser DOM globals.
- Refresh the reviewed family-specific font-face stylesheets with
  `npm run update:font-css`.
- `npm run preview` is the same workerd-based preview used by production tests.

The build does not call a paid search API and needs no public search-provider key.
The browser fetches only supported bundles matching the selected sources and
effective documentation language. The EN/JA interface language is the default;
an explicit `locale:en` or `locale:ja` query overrides it for that search.

## Font Delivery

`src/font-faces-alexandria.css` and `src/font-faces-line-seed-jp.css` contain
reviewed face declarations for Alexandria 400/500/600/700 and LINE Seed JP
400/700. Astro fingerprints them separately from the compact page stylesheet,
which is inlined into the compressed private HTML to remove its network
dependency. Client initialization applies Alexandria after document
parsing and applies LINE Seed JP only for Japanese UI or results; `noscript`
keeps the same family contract without JavaScript. All 252 Unicode-subset WOFF2
files are served from `public/fonts/google/` with their upstream OFL license
files and an immutable cache policy.

Run `npm run update:font-css` only for an intentional font refresh. The updater
requires the exact families, weights, `font-display: swap`, WOFF2 format, and
Google source origin, verifies every downloaded binary, and rewrites it to a
first-party path. Review the generated CSS and files, then rerun visual
verification.

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

Pick known queries that reach a record whose URL exercises the source's URL
construction, not one whose path is a plain lowercase slug. Live verification
prefers an exact normalized title and then falls back to the first token match,
so a query that stops at a generic page cannot detect a broken URL rule.

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

`npm run build && npm start` runs the exact Cloudflare Workers output through
Astro's workerd-based preview.
The production origin is set in `astro.config.mjs` so canonical, `hreflang`,
Open Graph, robots, and sitemap URLs are absolute and consistent.
The clean top page and its `?ui=en` and `?ui=ja` representations are
discoverable; query, source, and filter state remain crawlable but
`noindex,follow`.
Cloudflare serves matching static files before invoking the Worker and performs
production transport compression for static assets at the edge. Astro emits an immutable
one-year policy for content-hashed `/_astro/` files, and `public/_headers`
applies the same policy to the pinned WOFF2 files and to the content-addressed
bundles under `/search-index/bundles/`. Both manifests stay revalidated so a
new deployment is picked up immediately. Missing files do not receive that
policy.

`src/middleware.ts` declares `private, no-cache, no-transform` on every
server-rendered HTML document, which is rendered from the visitor's language, theme, and source
cookies. `Vary` already carries that dependency; the explicit policy removes the
ambiguity for a shared cache that handles `Vary` poorly, and `no-cache` keeps the
browser's back-forward cache, which `no-store` would forfeit. `no-transform`
stops the Cloudflare edge from rewriting the document, which it otherwise does to
inject its Web Analytics beacon. The same middleware negotiates gzip, merges
`Vary: Accept-Encoding`, and asks the Workers runtime to stream that encoding;
this compresses private HTML without permitting an intermediary transform.
Astro preview's Node-facing port transparently decodes the inner workerd
response, so transport inspection must use direct workerd or the deployment.

A valid direct query preloads the revalidated runtime manifest and up to four
exact selected bundles before the search worker discovers them. The hints have
a cumulative 500 KiB deterministic Brotli ceiling. Empty, invalid, and
no-source pages emit no search-index hint.

`wrangler.jsonc` pins the current compatible runtime date, the production custom
domain, Node compatibility, disabled persistent observability, and the adapter's
unused `SESSION` KV namespace so deployments never provision new resources. The
application does not add analytics. Run `npm run check:worker` before release;
do not run `wrangler deploy` unless the deployment is explicitly authorized.

## Dependency Licenses

Production dependencies must carry permissive licenses. `scripts/check-licenses.mjs`
reads `package-lock.json`, fails on strong copyleft, undeclared, or unrecognized
licenses, and permits weak copyleft only for the reviewed build-time tools listed in
the script. Those tools run during the build; the deployed Worker bundle contains no
native binary or CSS transformer. Adding a dependency that trips the check requires a
recorded decision, not an allowlist edit alone.

## Common Failures

- A supported catalog entry without an adapter, or an adapter without a supported entry, fails generation.
- Empty, malformed, out-of-scope, or unexpectedly smaller input fails before publication.
- `npm run check:search-index` reports missing, changed, or obsolete artifacts without repairing them.
- If an upstream change is intentional, update artifacts, review the manifest and bundle diff, and run complete verification.
