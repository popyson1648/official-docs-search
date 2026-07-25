# Testing

## Test Types

- `npm test` runs Vitest unit tests for query parsing, source selection, client controls, highlighting, adapters, deterministic publication, compact bundles, ranking, runtime loading, and language diversification.
- `npm run test:integration` verifies all committed supported indexes, catalog/manifest agreement, minimum counts, content hashes, allowed original URLs, per-bundle and selected-set size budgets, every known query, and combined-language results.
- `npm run test:server` builds and verifies production SSR, Brotli/gzip negotiation, body integrity, `ETag`, conditional `304`, `Vary`, and cache policies.
- `npm run test:e2e` builds and drives Chromium against the production server and real committed indexes.
- `npm run test:live` stages current upstream data, checks that committed artifacts match, verifies one known live result URL for every supported index, and reruns integration tests.

## Minimum Checks Before Completion

Run:

```sh
python3 scripts/verify.py
```

The default mode includes live network verification and the production server contract.
Pre-commit and CI use committed bundles and skip live upstream access so third-party outages do not make those modes flaky.
`npm run test:live` does not modify committed search-index files.

## Checks By Change Type

- Query syntax: update `tests/query.test.ts`.
- Catalog and source resolution: update `tests/sources.test.ts` and `tests/catalog.test.ts`.
- Generation or adapters: update `tests/search-index-generator.test.ts`, `tests/search-index.test.ts`, and intentional generated artifacts.
- Runtime loading or ranking: update `tests/search-runtime.test.ts`, `tests/search.test.ts`, and integration coverage.
- Client controls or rendering: update focused client tests and `tests/e2e/search.test.mjs`.
- Production compression or caching: update and run `tests/integration/production-server.test.mjs`.
- Catalog adapter or upstream-data changes: run the update command intentionally, review the diff, then run `npm run test:live`.
- Build or verification changes: run the complete verification script.

## Required Browser Coverage

E2E coverage includes at least one real result for every catalog language,
all 17 supported Japanese indexes, all 27 language-level JA-to-EN fallbacks,
single- and multi-language results, non-official source enable/disable with
selection preservation, exact and fallback Docs locales, UI locale independence,
HTTP and malformed-bundle partial failure, visible edition qualifications,
explicit support states, empty/error states, escaping,
safe new-tab links, per-source Japanese-availability labels, compact source
metadata order, a single-column source picker, right-aligned header actions, and
desktop/mobile visibility.
Multi-language form coverage accepts whitespace after commas, adds default
Sources only for newly introduced languages, and preserves checked non-official
Sources while their controls are disabled.
Result-layout coverage fixes the classification/source-and-URL/title/annotation
order, shared source-kind badge styling, title-to-annotation typography
hierarchy, removable input-chip dimensions, keyboard removal, and compact
successful result counts. Compact source controls retain 24 CSS-pixel targets,
and Docs-locale and chip-removal controls expose visible keyboard focus.
Search-guidance coverage requires one concrete unboxed example per syntax row,
accurate alias wording, a persistent short `js promise all` example, one
multi-token AND explanation in the search-syntax dialog, and one compact
fallback explanation with a semantic source list instead of repeated sentences.
The generic Japanese-availability notice is visible before searching and hidden
when result-specific fallback details are available.
Result-filter coverage requires exact language and site facets from the full
matching set, OR behavior within a facet, AND behavior across facets, cached
in-page re-search, one removable applied pill per facet, clear-all behavior,
and current result counts and notices. Interaction coverage fixes the Popyson
Blog reference behavior: overlay opening without result reflow, property
switches and choices that keep the panel open, outside-pointer dismissal,
Escape and Back focus restoration, active-trigger state, localized accessible
names, 260/180 ms width morphing, 375 px viewport containment, coarse-pointer
targets, and reduced-motion suppression.
The 18 admitted non-official teaching sources must remain excluded from
official-only searches, return a known result under `source:all`, and expose
their English/Japanese qualification in the source picker and result metadata.
Under 4× CPU throttling and Fast 3G with the browser cache disabled, an uncached
Python EN-to-JA Docs-locale switch must complete within 1,500 ms without a new
document request.
A repeated switch using the page-lifetime worker cache must complete within
500 ms and produce no search-time Long Task over 50 ms.
A result container without a non-empty original-document link is not a successful search test.

## Generation Safety Coverage

Generator tests require identical artifacts from identical inputs, deterministic
catalog order under bounded concurrency, duplicate-job rejection, no published
changes when a later adapter fails, non-mutating check mode, failures for
corrupt/timeout/non-success input, and explicit override for large count or
compressed-size changes. Sphinx title and section metadata must be normalized to
plain text before publication.
