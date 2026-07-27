# Testing

## Test Types

- `npm test` runs Vitest unit tests for query parsing, source selection, client controls, highlighting, adapters, deterministic publication, compact bundles, ranking, runtime loading, and language diversification.
- `npm run test:integration` verifies all committed supported indexes, catalog/manifest agreement, minimum counts, content hashes, allowed original URLs, per-bundle and selected-set size budgets, every known query, and combined-language results.
- `npm run test:server` builds and verifies production SSR, Brotli/gzip negotiation, body integrity, `ETag`, conditional `304`, `Vary`, and cache policies.
- `npm run test:e2e` builds and drives Chromium against the production server and real committed indexes.
- `npm run test:e2e:filters`, `npm run test:e2e:catalog`,
  `npm run test:e2e:layout`, and `npm run test:e2e:performance` run bounded
  browser concerns against an existing build.
- `npm run test:live:affected` regenerates and checks only source families
  affected by the current diff, then verifies their known live result URLs.
- `npm run test:live` explicitly checks every upstream source and live result
  URL.

## Minimum Checks Before Completion

Run:

```sh
python3 scripts/verify.py
```

The default command combines commits not yet present on the branch upstream
(falling back to `origin/dev` then `origin/main`) with staged, unstaged,
deleted, and untracked files, then runs only the applicable pre-push phases.
Documentation-only changes run no Node command.
Unknown implementation or configuration paths fall back to all offline phases.
New implementation, test, or configuration paths also fall back to all offline
phases until their narrower ownership rule is committed.
Pre-commit uses its staged filenames, while CI compares the exact push or pull
request range and skips Node setup entirely when no phase is selected.

Run `python3 scripts/verify.py --mode ci --full` for complete deterministic
offline verification.
Run `python3 scripts/verify.py --mode all --full --include-network` only when a
complete all-source live check is required.
Network phases otherwise run only when an affected adapter, parser, generator,
transport, or catalog path selects them.
Both live commands are non-mutating.

## Checks By Change Type

- Query syntax: update `tests/query.test.ts`.
- Catalog and source resolution: update `tests/sources.test.ts` and `tests/catalog.test.ts`.
- Generation or adapters: update `tests/search-index-generator.test.ts`, `tests/search-index.test.ts`, and intentional generated artifacts.
- Runtime loading or ranking: update `tests/search-runtime.test.ts`, `tests/search.test.ts`, and integration coverage.
- Client controls or rendering: update focused client tests and the applicable
  tagged scenarios in `tests/e2e/search.test.mjs`.
- Production compression or caching: update and run `tests/integration/production-server.test.mjs`.
- Catalog adapter or upstream-data changes: run the source-scoped update
  intentionally, review the diff, then run `npm run test:live:affected`.
- Build or verification changes: run
  `python3 scripts/verify.py --mode ci --full`.
- Unknown classifications, invalid comparison bases, and shared indexing paths
  fail safe to the broad applicable scope.

## Required Browser Coverage

E2E coverage includes at least one real result for every catalog language,
all 18 supported Japanese indexes, all language-level JA-to-EN fallbacks,
single- and multi-language results, non-official source enable/disable with
selection preservation, exact and fallback Docs locales, UI locale independence,
HTTP and malformed-bundle partial failure, visible edition qualifications,
explicit support states, empty/error states, escaping,
safe new-tab links, per-source Japanese-availability labels, compact source
metadata order, a single-column source picker, right-aligned header actions, and
desktop/mobile visibility.
Header-layout coverage keeps the title geometrically centered, orders Search
syntax before EN/JA, and moves mobile actions below the title.
Mobile setting coverage fixes the two switches and Docs-locale control to one
right edge, keeps setting descriptions non-interactive, and verifies accessible
control names independently of translated text length.
It also fixes the C++ completeness regression (`cpp sort`), conservative fuzzy
recovery (`cpp srot`), cpprefjp Japanese results, proposal-source labeling and
ranking, silent automatic-fallback settings/override behavior, bounded
keyboard suggestions, and one shared no-source/no-result status component.
The no-source path must not request the manifest.
Multi-language form coverage accepts whitespace after commas, adds default
Sources only for newly introduced languages, and preserves checked non-official
Sources while their controls are disabled.
Result-layout coverage fixes the classification/source-and-URL/title/annotation
order, shared source-kind badge styling, title-to-annotation typography
hierarchy, removable input-chip dimensions, keyboard removal, and compact
successful result counts. Compact source controls retain 24 CSS-pixel targets,
and Docs-locale and chip-removal controls expose visible keyboard focus.
Locale-fallback details precede the successful result count.
Loading coverage fixes four result-card skeletons, a vertically centered
indicator, screen-reader-only loading text, `aria-busy` cleanup, and static
reduced-motion rendering at desktop and 390-by-800 mobile sizes.
Title coverage requires canonical cpprefjp, Ruby, ExDoc, and Javadoc owners,
conservative prose context, unchanged proposal identifiers, and no bare
cpprefjp `sort` result.
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
The 18 admitted English teaching sources and cpprefjp must remain excluded from
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
Shared title qualification changes must select every source family in live
change classification.
