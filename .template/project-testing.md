# Testing

## Test Types

- `npm test` verifies query, catalog, client controls, highlighting, adapters, deterministic publication, compact bundles, runtime loading, ranking, and diversification.
- `npm run test:integration` verifies all supported indexes, catalog/manifest agreement, counts, hashes, URL scope, size budgets, known queries, and multi-language results.
- `npm run test:server` verifies production SSR, gzip/Brotli, validators, conditional responses, and cache policies.
- `npm run test:e2e` drives Chromium against the production server and real committed bundles.
- `npm run test:live` checks staged upstream artifacts and live result links without changing committed artifacts.

## Minimum Checks Before Completion

Run `python3 scripts/verify.py`.
The default mode includes the live network phase and server contract.
Pre-commit and CI use committed bundles and skip live upstream access.

## Checks By Change Type

- Update focused unit tests for parser, source-resolution, runtime, and client changes.
- Update generator tests, integration thresholds, and intentional artifacts for adapter changes.
- Update server-contract tests for compression or caching changes.
- Update browser flows for user-facing behavior changes.
- Run live verification after reviewing any intentional upstream-data refresh.

## Required Browser Coverage

Assert non-empty original links, selected supported languages, source toggles and preservation, locales, support states, escaping, safe new-tab behavior, and desktop/mobile visibility.
Keep the 4×-CPU warm mobile search at or below 500 ms with no search-time Long Task over 50 ms.

## Generation Safety Coverage

Require deterministic identical-input output, no partial publication, non-mutating check mode, corrupt/timeout/error rejection, and explicit approval for large changes.
