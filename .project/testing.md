# Testing

## Test Types

- `npm test` runs Vitest unit tests for query parsing, source selection, client controls, highlighting, adapters, deterministic publication, compact bundles, ranking, runtime loading, and language diversification.
- `npm run test:integration` verifies all committed supported indexes, catalog/manifest agreement, minimum counts, content hashes, allowed original URLs, per-bundle and selected-set size budgets, every known query, and combined-language results.
- `npm run test:server` builds and verifies the workerd production preview,
  SSR metadata, language and theme precedence, legal pages, footer links,
  noindex behavior, robots, sitemap, brand assets, local font delivery, and
  immutable static-asset policies, including immutable index bundles alongside a
  revalidated runtime manifest.
- `npm run test:e2e` builds and drives Chromium against the Workers preview and
  real committed indexes. It also records every browser request during a visit
  and a search and requires them all to stay first-party, matching the Privacy
  Policy's statement that no third-party tag or SDK is embedded.
- `npm run test:e2e:filters`, `npm run test:e2e:catalog`,
  `npm run test:e2e:layout`, and `npm run test:e2e:performance` run bounded
  browser concerns against an existing build.
- `npm run test:live:affected` regenerates and checks only source families
  affected by the current diff, then verifies their known live result URLs.
- `npm run test:live` explicitly checks every upstream source and live result
  URL.
- `node scripts/check-licenses.mjs` reviews every production dependency license,
  failing on strong copyleft, unreviewed weak copyleft, and undeclared licenses.

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
- Production hosting or caching: update and run
  `tests/integration/production-server.test.mjs` and `npm run check:worker`.
- Font delivery: verify the Alexandria and LINE Seed JP family/weight contract,
  the local WOFF2 files and licenses, then compare font-loaded screenshots,
  geometry, and ordered results.
- Catalog adapter or upstream-data changes: run the source-scoped update
  intentionally, review the diff, then run `npm run test:live:affected`.
- Build or verification changes: run
  `python3 scripts/verify.py --mode ci --full`.
- Unknown classifications, invalid comparison bases, and shared indexing paths
  fail safe to the broad applicable scope.

## Required Browser Coverage

E2E coverage includes at least one real result for every catalog language,
all 18 supported Japanese indexes, all language-level JA-to-EN fallbacks,
single- and multi-language results, the three-state non-official-source policy
with selection preservation, the proposal-source group toggle's selected,
cleared, and partial-selection states, unified UI/documentation language behavior,
explicit `locale:` overrides, legacy Docs-state migration, HTTP and
malformed-bundle partial failure, visible edition qualifications, explicit
support states, empty/error states, escaping, safe new-tab links, per-source
Japanese-availability labels, compact source metadata order, a single-column
source picker, right-aligned header actions, and desktop/mobile visibility.
Header-layout coverage keeps the title geometrically centered and EN/JA aligned
to the right independently of translation width; on mobile the global EN/JA
control precedes the page title.
Mobile setting coverage keeps the compact, right-aligned, always-visible
three-state source policy within the content width. Its non-interactive label
stays beside the control when the localized widths fit; otherwise complete
items wrap without clipping, overlapping, or horizontal page overflow.
Search-help coverage places a 44 CSS-pixel, labelled dialog trigger after the
visible Search submit button, shows its localized tooltip on hover and keyboard
focus, restores focus after dialog close, and keeps the query usable without
page overflow down to 320 CSS pixels.
At narrow widths, the unified EN/JA control uses the right edge above the title.
Tests that replace manifest or bundle responses run the search on the page
thread so Puppeteer interception owns those fetches deterministically; normal
catalog and performance coverage continues to exercise the Web Worker.
It also fixes the C++ completeness regression (`cpp sort`), conservative fuzzy
recovery (`cpp srot`), cpprefjp Japanese results, proposal-source labeling and
ranking, silent automatic-fallback settings/override behavior, bounded
keyboard suggestions, and one shared no-source/no-result status component.
The no-source path must not request the manifest.
Multi-language form coverage accepts whitespace after commas, adds default
Sources only for newly introduced languages, renders policy-disabled
non-official Sources unchecked, restores their preserved choices, and keeps an
open Sources disclosure open across policy navigation.
Result-layout coverage requires the same non-link title, adjacent colored
language tag, and subordinate source-link structure for single- and
multi-origin results. It also fixes user-facing catalog language names,
exact solid Linguist tag backgrounds without a separate marker,
brightness-derived black/white tag text across the full palette, source-kind
styling, title-to-metadata typography, removable input-chip dimensions,
language-color ownership of only the query-chip label segment, theme-tinted
remove segments, keyboard removal, and compact successful result counts. Compact
source controls retain 24 CSS-pixel targets, and unified-language and
chip-removal controls expose visible keyboard focus.
Theme coverage fixes `#825CFF` as the light browser and interface accent,
preserves the previous light palette levels' perceptual lightness, uses stronger
light-purple surfaces and accent-colored enabled controls, and keeps light
result titles black. Dark coverage verifies the reviewed purple-black semantic
palette, WCAG text and control contrast, server-rendered cookie state, live
System preference changes, persisted explicit overrides, localized
`menuitemradio` state, arrow/Home/End/Escape behavior, focus restoration, and
mobile containment. It also checks the header lockup's rendered geometry,
brand-asset dimensions and byte budgets, and requires SVG external-link marks
without text or emoji glyphs at desktop and mobile widths.
Duplicate-result coverage conservatively groups only qualified reference
symbols from distinct origins, preserves every safe source link, keeps
ambiguous and proposal records separate, renders at most 15 groups initially,
and discloses later groups in 15-item batches without navigation. Grouped
origins render as compact borderless links beneath a stronger title; top-level
groups use whitespace instead of repeated dividers.
Repeated source qualifications appear once in a borderless details section no
taller than the main Sources summary.
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
No generic Japanese-availability notice appears before searching.
Result-specific fallback details and per-source availability labels remain.
Result-filter coverage requires exact language and site facets from the full
matching set, OR behavior within a facet, AND behavior across facets, cached
in-page re-search, stable language-name ascending and descending order without
an index refetch, one removable applied pill per facet, clear-all behavior, and
current result counts and notices. Interaction coverage fixes the Popyson
Blog reference behavior: overlay opening without result reflow, property
switches and choices that keep the panel open, outside-pointer dismissal,
Escape and Back focus restoration, active-trigger state, localized accessible
names, the compact icon-only filter trigger, 260/180 ms width morphing, 375 px
viewport containment, coarse-pointer choices, and reduced-motion suppression.
The compact toolbar is pill-shaped, while the choice panel, search inputs, and
suggestion surfaces remain rounded rectangles. Choice chips flow horizontally;
at 375 px they stay in one horizontally scrollable row without creating page
overflow. Language choices reuse result-tag colors; selected Site and Order
choices, applied filters, and focus treatment use the theme accent.
Settings-toggle coverage fixes accent-colored checked and focused tracks while
keeping unchecked tracks muted.
Legal-page coverage checks the compact footer, Google Forms external-link
attributes, EN/JA rendering, noindex metadata, light and dark themes, mobile
containment, named AI services, and report-retention disclosure.
Interactive-search performance coverage requires ordinary form and
source-policy submissions to preserve the document and avoid any query-page
request while reusing cached indexes. Direct GET URLs remain the no-JavaScript
fallback.
Long-page coverage keeps a 44 CSS-pixel bottom-right Top control hidden near the
header, shows it after scrolling, returns focus to the page heading, localizes
its accessible name, and suppresses its motion when requested.
The 18 admitted English teaching sources and cpprefjp must remain excluded from
official-only searches, return a known result under `source:all`, and expose
their English/Japanese qualification in the source picker and result metadata.
Under 4× CPU throttling and Fast 3G with the browser cache disabled, an uncached
Python EN-to-JA unified-language switch in the HTTP/1 workerd preview must
complete within 8,000 ms without a new document request. This provisional local
budget includes the preserved LINE Seed JP font-subset requests triggered by
changing the visible interface and waits for `document.fonts.ready`. The
deployed HTTP/2 or HTTP/3 production origin must be re-audited against the
4,500 ms target.
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
