# Structure

## Top-level Directories

- `src/client/`: browser controllers, result rendering, and search worker.
- `src/core/`: framework-independent query, catalog, runtime, and ranking logic.
- `src/data/`: canonical source, locale, and support-state catalog.
- `src/pages/`: Astro routes and server-rendered shells.
- `scripts/`: source-family jobs and parsers, change-scope classification,
  reproducible full/partial publication, live verification, and production
  serving.
- `public/search-index/`: committed compact indexes and manifest.
- `tests/`: unit, integration, server-contract, live-data, and browser verification.
- `.plans/` and `.decisions/`: task and architecture history.

## Important Modules

- Document query parsing, catalog/support resolution, compact-tuple ranking, runtime fetching, pure client helpers, browser controllers, the worker, source adapters, deterministic publication, live verification, and production serving.
- Document production-sidecar generation separately from runtime serving.
- List committed generated font declarations and their validated refresh script
  when typography is part of the product contract.

## Runtime Data Flow

1. Resolve the initial query, catalog scope, interface and effective
   documentation languages, and selected sources on the server. Document the
   precedence of persistent preferences and query-level overrides.
2. Fetch and retain a lightweight runtime status manifest in a page-lifetime
   worker while keeping the complete provenance manifest canonical.
3. Prefer an exact content locale and visibly fall back from Japanese to English
   only when the source has no Japanese index.
4. Fetch, cache, validate, and search matching supported bundles in the worker,
   retaining partial results when one bundle fails or is malformed.
5. Apply unified language changes in page while synchronizing interface copy,
   URL, preference, availability labels, and results.
   Document whether setting descriptions are interactive labels or
   non-interactive text with separately named controls. Define mobile alignment
   and localized-width wrapping behavior.
6. Derive exact language/site facets from all matches and re-search cached
   indexes for the selected source subset. Document any result-order choices,
   default, tie-breaker, and whether changing order causes an index fetch.
7. Render original HTTPS links, actual locales, locale-fallback and failure
   notices, and explicit unsupported states; document whether source fallback
   is intentionally silent.
8. Document duplicate-result identity, single- and multi-origin title/link
   structure, language-tag metadata, visual hierarchy, incremental disclosure,
   source-level qualification ownership, and any contextual long-page
   navigation control.
9. Document title qualification and loading-state ownership, including
   `aria-busy`, reduced-motion behavior, and the boundary between verified API
   ownership and prose context.

## Areas That Require Extra Care

- Keep generated bundles synchronized with their adapters.
- Report unsupported sources instead of silently returning an empty list.
- Store only necessary index metadata and link to original documentation pages.
- Never invent a qualified API title without reviewed ownership metadata.
- Keep DOM controllers in `src/client/` and reusable logic in `src/core/`.
- Keep source policy, transfer estimates, tests, and artifacts synchronized with adapter or delivery changes.
