# Plan

## Goal

Make initial rendering, search, language changes, source changes, and back-to-top interactions as fast as this site can reasonably deliver without changing the site's typography, visual design, interaction model, result completeness, relevance, accessibility, or URL/history behavior.

Performance is not an acceptable improvement if the site becomes less recognizable, less stable, less understandable, or less useful.

Measured mobile baseline (Fast 3G, 4x CPU slowdown, 390 x 800):

| Path | Baseline |
| --- | ---: |
| Initial `cpp sort` result completion | 7,820 ms |
| Search runtime within the initial page | 5,563 ms |
| UI language change | 54 ms |
| Docs locale change, cold / warm | 1,205 / 54 ms |
| Source policy change | 5,323 ms |
| Individual source change plus search | 5,273 ms |
| Next same-language search | 5,268 ms |
| Back to top | 647 ms |

The search-page Lighthouse baseline is Performance 60, LCP 6.96 s, 45 requests, and about 1.05 MB transferred. Third-party fonts account for 34 requests and about 547 KB. The full search-index manifest is 151,390 bytes raw; a runtime-only projection is about 32,645 bytes raw and 5,688 bytes with Brotli.

Targets under the same local mobile profile:

- Improve the median of at least five Lighthouse mobile runs; do not optimize for one score.
- Reach LCP at most 2.5 s where the exact typography and loading behavior allow it.
- Reduce initial complete-result time and the three approximately 5.3 s navigation paths substantially.
- Keep warm same-scope search, source-policy change, and Docs-locale change below 200 ms where no new index download is required.
- Keep UI-language changes below 100 ms with no navigation.
- Preserve the current smooth back-to-top duration while keeping click response below 100 ms, avoiding dropped frames, and retaining focus behavior.
- Introduce no interaction-attributable task longer than 50 ms in the measured paths.
- Accept a change only when visual, result-equivalence, accessibility, and interaction guardrails all pass.

## Scope

- Initial HTML, CSS, JavaScript, font, and search-index delivery.
- Search worker startup, manifest loading, bundle caching, cancellation, and rendering.
- Same-document search and state changes for UI language, Docs locale, source policy, and source checkboxes.
- Fast fallback navigation for scope changes that still need server rendering.
- Back/forward history, focus, loading, and back-to-top behavior.
- Visual and result-equivalence guardrails, performance budgets, regression tests, and production-server contracts.

## Non-goals

- Changing search relevance, indexed content, source trust classification, or source update schedules.
- Changing Alexandria, LINE Seed JP, their requested weights, or the intended typography.
- Redesigning the visual hierarchy or controls.
- Making source checkboxes auto-submit or otherwise changing the current interaction sequence.
- Reordering visible results after they have been presented to the user.
- Shortening or removing intentional animations merely to improve a timing number.
- Requiring a particular CDN or hosting provider.
- Trading away keyboard access, reduced-motion support, visible loading feedback, or correct URLs.

## Assumptions

- Alexandria and LINE Seed JP are product assets. Their rendered appearance and fallback behavior must remain equivalent.
- Result completeness and ordering remain mandatory before the loading state ends.
- Existing control semantics and submission timing remain unchanged; only the work after an action is accelerated.
- The existing server-rendered GET form remains the no-JavaScript fallback.
- An optimization with ambiguous or unmeasurable benefit is not shipped.

## Steps

1. Capture a value-preservation baseline before implementation:
   - screenshots after fonts settle at 320, 390, and desktop widths, in English and Japanese;
   - computed font family, weight, line metrics, element geometry, focus order, loading states, and accessibility tree;
   - exact ordered result snapshots for representative exact, fuzzy, multilingual, Japanese-fallback, proposal, and non-official-source queries.
2. Establish a professional measurement matrix instead of relying on Lighthouse alone:
   - Lighthouse CLI, mobile and desktop, at least five cold runs with median and spread;
   - Chrome DevTools Performance traces for LCP, INP, CLS, long tasks, style/layout, paint, and network dependency chains;
   - DevTools Network and Coverage for compression, caching, request waterfalls, unused CSS/JS, and repeat-view behavior;
   - Puppeteer user-flow benchmarks under Fast 3G with 4x CPU slowdown and a low-end 20x CPU stress pass;
   - Vite/Rollup bundle composition and production response-header inspection;
   - PageSpeed Insights/CrUX and WebPageTest first-view, repeat-view, and filmstrip checks against the production domain when field data and the service are available.
3. Apply delivery optimizations that cannot affect presentation:
   - enable Brotli/gzip for compressible HTML, CSS, and JavaScript;
   - preserve existing content while letting Astro minify and fingerprint CSS only if screenshot and computed-style parity is exact;
   - retain immutable caching for content-hashed assets and revalidation for mutable entry points;
   - verify response bodies byte-for-byte after decompression.
4. Preserve the current fonts and compare delivery strategies experimentally:
   - keep Alexandria and LINE Seed JP with the same weights and rendering behavior;
   - compare the current Google Fonts path with self-hosted copies of the exact same WOFF2 subsets, same `font-display`, and immutable caching;
   - use only license-compatible official font files;
   - ship self-hosting only if repeated first/repeat-view measurements improve and font-loaded screenshot, line-break, geometry, and CLS checks are equivalent; otherwise retain Google Fonts unchanged.
5. Preserve the client runtime across GET-form navigations using Astro's supported client-routing lifecycle, with no added transition animation. Keep the search worker and parsed-index cache alive while ensuring the visible loading, focus, scroll, URL, back/forward, and no-JavaScript behaviors match the baseline.
6. Accelerate common actions without changing their semantics:
   - keep UI-language and Docs-locale switches in the current document;
   - keep source-policy auto-submit behavior;
   - keep individual source checkboxes pending until the existing Search action;
   - reuse the worker, loaded bundles, and parsed normalized records after submission;
   - cancel stale work and avoid duplicate fetch, parse, search, and render passes.
7. Optimize index delivery without changing final-result presentation:
   - fetch required bundles concurrently as today;
   - schedule safe post-result prefetch only when it cannot compete with the active search and data-saver/very-slow-network signals permit it;
   - do not reveal partial results that would later move or reorder.
8. Treat the runtime-manifest projection as a gated experiment, not a presumed change:
   - retain `manifest.json` as the complete canonical provenance and verification record;
   - if a runtime projection is used, retain every field consumed by selection, validation, ranking, notices, qualification text, and rendering;
   - generate both atomically with matching schema, generator, and catalog identity;
   - compare the full and projected paths across the complete query corpus for identical ordered records, facets, unavailable/fallback/failed sources, notices, and errors;
   - abandon the projection if any behavior differs or if the measured saving does not justify the added maintenance.
9. Reduce internal rendering work without visual changes by creating only the visible result batch initially, batching DOM updates, preserving filter/source-detail state, and leaving the existing skeleton, shimmer, labels, spacing, and animations intact.
10. Preserve the native smooth back-to-top motion. Profile its click-to-first-frame latency and frame pacing, remove only avoidable main-thread work, and retain focus, reduced-motion, visibility, and duration behavior.
11. Run targeted unit, integration, server-contract, E2E, visual-equivalence, accessibility, Chrome trace, Lighthouse, and production-domain verification. Reject or revert any optimization that fails a value-preservation guardrail, then run `python3 scripts/verify.py`.

## Verification

- `python3 scripts/verify.py --mode edit`
- `python3 scripts/verify.py --mode pre-push`
- Focused unit tests for runtime-manifest projection, cache invalidation, source-state resolution, and stale-request cancellation.
- Production server tests for Brotli/gzip, `Vary`, ETag, revalidation, and immutable asset caching.
- Mobile E2E performance tests under Fast 3G and 4x CPU slowdown with explicit budgets and long-task observation.
- E2E behavior tests for no-JavaScript GET fallback, query/source/locale URLs, back/forward navigation, focus, source-details persistence, and complete final results.
- Exact ordered-result equivalence over representative and generated query corpora.
- Font-loaded screenshot, computed-style, line-break, geometry, and CLS comparisons.
- At least five Lighthouse mobile and desktop runs against the production build, reporting median and spread.
- Chrome DevTools load and interaction traces, Network/Coverage inspection, and bundle composition analysis.
- Accessibility snapshots and existing layout coverage at 320, 390, and desktop widths.
- Production-domain PageSpeed Insights/CrUX and WebPageTest checks when available.

## Outcome

- Kept the exact fonts and remote WOFF2 files. Bundling the reviewed face
  declarations locally reduced the five-run mobile LCP median from 1,958 ms to
  1,204 ms; loaded screenshots and geometry remained pixel-identical.
- Adopted the runtime manifest after all known queries and the C++ exact,
  fuzzy, locale, and source-policy matrix produced deeply equal results.
- Added build-only maximum-compression sidecars whose decoded bytes match all
  92 source JSON files.
- Preserved the page-lifetime worker with client-routed GET forms. Under Fast
  3G and 4× CPU slowdown, source-policy and repeated search paths fell from
  about 5.3 seconds to 0.75–0.80 seconds.
- Added intent-only Docs-locale warming and suppressed it on data-saver, 2G,
  and slow-2G connections.
- Preserved the back-to-top motion, font rendering, focus, URL/history,
  no-JavaScript fallback, loading UI, result order, and visible result batch.
- No CrUX field data was available, so the performance conclusions remain
  explicitly lab-based.
