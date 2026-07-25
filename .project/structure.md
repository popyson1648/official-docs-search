# Structure

## Top-level Directories

- `src/`: Astro application and TypeScript source.
- `src/client/`: browser controllers, result rendering, and the search worker.
- `src/core/`: framework-independent query, catalog, support-state, runtime, and ranking logic.
- `src/data/`: TOML catalog of official, conventional, and community documentation sources.
- `src/pages/`: Astro routes.
- `scripts/`: index adapters, reproducible publication, live verification, and production serving.
- `public/search-index/`: committed compact search bundles and manifest.
- `tests/`: unit, integration, production-server, and real-browser tests.
- `.plans/` and `.decisions/`: approved task plans and architecture history.

## Important Modules

- `src/core/query.ts`: parses language, source, and locale query syntax.
- `src/core/sources.ts`: loads the canonical catalog, resolves scope and support states, and validates result URLs.
- `src/core/search.ts`: validates bundle identity, scans compact tuples without expanding every record, ranks matches, and diversifies languages.
- `src/core/search-runtime.ts`: fetches and validates manifest-selected bundles and isolates unavailable, failed, or malformed sources.
- `src/core/result-filters.ts`: resolves language and source facet selections with OR-within and AND-across semantics.
- `src/core/highlight.ts` and `src/core/search-controls.ts`: pure query-highlight and preference/selection helpers.
- `src/client/search-controls.ts`: binds query, in-page locale, source, cookie, URL, tag, and help controls.
- `src/client/search-results.ts`: reuses the page-lifetime worker, rejects stale responses, and renders external strings with DOM text APIs and safe links.
- `src/client/search-result-filters.ts`: renders compact accessible language/site filters and applied-filter pills.
- `src/client/search-page.ts`: small browser initialization entry point.
- `src/client/search.worker.ts`: parses and searches selected indexes off the main thread.
- `src/pages/index.astro`: server-rendered search form and result shell.
- `scripts/search-index.mjs`: shared DevDocs, Sphinx, Ecmarkup, Javadoc, and HTML normalization helpers.
- `scripts/search-index/`: source-family job registries, parser modules, and job helpers.
- `scripts/generate-search-index.mjs`: the composed job registry and update/check CLI.
- `scripts/search-index-generator.mjs`: deterministic validation, manifest construction, staging, and manifest-last publication.
- `scripts/verify-live-search-index.mjs`: verifies a known live result URL for every supported index.
- `scripts/serve-production.mjs`: serves Astro middleware with the search-asset compression and cache contract.

## Runtime Data Flow

1. Astro resolves the initial query, catalog scope, locale, and selected sources.
2. The client requests the complete status manifest and keeps it in the
   page-lifetime worker.
3. The runtime prefers an exact locale and visibly falls back from Japanese to
   the source's English bundle when no Japanese index exists.
4. The worker fetches and caches matching supported bundles, keeps successful
   bundles when one load fails, scans compact tuples, and ranks/diversifies
   matches.
5. A Docs-locale change updates the URL, preference, availability labels, and
   results without replacing the current document.
6. The runtime derives exact language/site facets from all matches; applied
   filters re-search the cached indexes for the selected source subset.
7. The client renders original HTTPS links, actual content locales, fallback
   notices, partial failures, and explicit unsupported states.

## Change Rules

- Add source metadata and every locale status in `src/data/docs-sources.toml`.
- Add a verified adapter and generated content-addressed bundle in the same change before declaring `supported`.
- Keep unsupported sources visible as unsupported; never turn a missing bundle into a silent empty result.
- Keep upstream titles, headings, and original URLs only; do not republish complete documentation pages.
- Keep browser DOM code in `src/client/` and reusable state/ranking logic in `src/core/`.
- Update source policy, performance numbers, generated artifacts, and tests when an adapter or delivery contract changes.
