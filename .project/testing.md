# Testing

## Test Types

- `npm test` runs Vitest unit tests for query parsing, source selection, client controls, highlighting, adapters, deterministic publication, compact bundles, ranking, runtime loading, and language diversification.
- `npm run test:integration` verifies all 13 committed supported indexes, catalog/manifest agreement, minimum counts, content hashes, allowed original URLs, compressed-size budgets, known EN/JA results, and combined-language results.
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

E2E coverage includes real single- and multi-language results, all newly indexed languages, non-official source enable/disable with selection preservation, Docs locale switching, UI locale independence, explicit support states, empty/error states, escaping, safe new-tab links, and desktop/mobile visibility.
Under 4× CPU throttling, the warm Python-plus-Rust mobile search must complete within 500 ms and produce no search-time Long Task over 50 ms.
A result container without a non-empty original-document link is not a successful search test.

## Generation Safety Coverage

Generator tests require identical artifacts from identical inputs, no published changes when a later adapter fails, non-mutating check mode, failures for corrupt/timeout/non-success input, and explicit override for large count or compressed-size changes.
