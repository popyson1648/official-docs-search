# Performance

## Current Snapshot

The 2026-07-27 manifest contains 90 supported bundles for 44 languages, 18
Japanese bundles, and 202,404 records.
Search normally fetches only bundles selected by language, source mode, and
effective documentation language; all-bundle totals are a conservative
catalog-wide upper bound. The top-right EN/JA choice supplies that language
unless the query contains an explicit `locale:` override.

| Payload | Raw | gzip | Brotli |
| --- | ---: | ---: | ---: |
| All bundles, generator regression settings (gzip 9 / Brotli 11) | 18,007,350 B | 2,463,438 B | 1,897,426 B |
| Runtime manifest, generator gzip / Brotli planning sizes | 40,972 B | 7,155 B | 5,798 B |
| All-bundle cold response including runtime manifest | 18,048,322 B | 2,470,593 B | 1,903,224 B |
| Full manifest, generator gzip / Brotli planning sizes (not fetched by search) | 151,390 B | 34,620 B | 27,742 B |

Manifest size fields use deterministic maximum-quality compression for
regression checks.
Transfer estimates use the deterministic generator compression sizes until
production Cloudflare response measurements are available.
Automated budgets require every bundle to remain below 750,000 Brotli-11 bytes,
the default four-language English official set below 1,000,000 bytes, and the
largest one-bundle set from four distinct languages below 2,000,000 bytes.
The current sets are 382,486 B and 601,284 B respectively.

## Page And Interaction Snapshot

### 2026-08-02 first-load remediation

The production audit before this change sent a 163,577-byte direct-query HTML
document without content coding because its privacy-preserving `no-transform`
directive disabled edge compression. The final production build sends the same
decoded representation contract through Workers gzip: the document is 194,700
bytes after inlining page CSS and 24,519 bytes on the wire, an 85% reduction
from the former live response. Decoding is byte-identical, and the response
retains `private, no-cache, no-transform` plus locale, cookie, and encoding
variance.

The generated font-face catalog is split by family and removed from the
render-blocking path. The 32 KiB minified page CSS is inlined into the compressed
document, so Lighthouse reports no render-blocking stylesheet, zero unused-CSS
savings, and a passing document-latency insight. The 16,132-byte Astro
`ClientRouter` and its lifecycle dependency are gone; application-owned state
restores Back/Forward searches without a document request.

Five cold Lighthouse 13.4.1 runs against the direct workerd production build
used the same direct JavaScript query, mobile simulation, and desktop preset as
the 2026-08-02 live baseline:

| Build path | Score median | LCP median (range) | FCP median | TBT median | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Live before, mobile | 97 | 2,140 ms (1,300–2,790) | — | 0 ms | 0.001 | 287 KiB | 8 |
| Final workerd, mobile | 100 | 1,661 ms (1,656–1,669) | 914 ms | 2 ms | 0.00063 | 152,379 B | 14 |
| Final workerd, desktop | 100 | 451 ms (449–454) | 251 ms | 0 ms | 0.00012 | 152,379 B | 14 |

The larger request count intentionally includes early manifest and exact-index
preloads, both result bundles, and their logical worker fetches. The worker
fetches reused the preloaded bundle bodies with zero additional body transfer.
The query URL correctly scores 69 for SEO because it is intentionally
`noindex,follow`; a separate clean-home audit scored 100 for Accessibility,
Best Practices, and SEO.

Under a 390×800 viewport, Fast 3G, 4× CPU slowdown, and an empty browser cache,
the final direct workerd query completed in 2,514 ms and recorded 1,744 ms of
application search time. The manifest and both exact JavaScript bundles began
together at about 640 ms rather than waiting for worker discovery. Ten later
same-scope searches completed in a 38 ms median, recorded a 17 ms median search,
and made zero document or search-index requests.

These are verified build measurements. The public site retains the prior live
behavior until this branch is deployed and remeasured over the production
HTTP/2 or HTTP/3 endpoint.

Measurements on 2026-07-28 use the production build. Lighthouse reports use
five cold runs. Interaction measurements use a 390×800 viewport, Fast 3G,
4× CPU slowdown, and disabled browser cache. No CrUX field data was available.

| Lighthouse path | Score median | LCP median | LCP range | Transfer |
| --- | ---: | ---: | ---: | ---: |
| Mobile C++ Japanese search | 100 | 1,204 ms | 1,128–5,980 ms | 861,768 B |
| Desktop C++ English search | 100 | 548 ms | 285–567 ms | 326,134 B |

The one mobile outlier was an external font-binary response; the other four
runs scored 100 with 1,128–1,206 ms LCP. TBT was 0 ms and CLS was 0.00043 in
all five runs.

Brand delivery adds a 5,447-byte 192×192 PNG mark and an 11,164-byte wordmark
SVG to the visible page, both declared with fixed dimensions and preloaded at
high priority without lazy loading. The lockup renders 360×69 on the search
page and 240×46 on the legal pages.
The social image is 1,200×675 and 30,856 bytes but is not requested during a
normal page visit.
The 192×192 favicon and 180×180 touch icon are 9,485 and 8,600 bytes.
A 2026-07-30 production-build reload trace at 375×900 with no artificial
throttling measured 110 ms LCP and 0.00 CLS.
The corresponding mobile Lighthouse audit scored 100 for accessibility, best
practices, and SEO with no failed audit.

The 2026-07-31 branch audit compared the local workerd preview with the live
deployment under the same mobile Lighthouse configuration. The preview scored 82
for performance with 3.5 s LCP and 521 KiB transferred; production scored 96 with
1.9 s LCP and 155 KiB, because the preview serves everything uncompressed while
Cloudflare applies Brotli at the edge. Both measured the same 0.095 CLS, caused
by the footer reflowing when the Alexandria subset swaps in, which predates the
brand lockup. A metric-matched `Alexandria Fallback` face closed that gap: the
system sans-serif renders 9.76% narrower than Alexandria, the adjusted face
renders 0.42% narrower, and mobile CLS fell to 0.001 with the remaining shift
coming from the source-policy fieldset. Accessibility reached 100 after
`role="group"` was added to the query-modifier container and filled controls
moved to the darker `#7951EF` action accent, which carries white labels at
4.96:1. Total blocking time was 0 ms in every run.

The 2026-07-30 Light/Dark production audit after adding the appearance menu
kept Performance, Best Practices, and SEO at 100 in both modes. Dark
Accessibility scored 100; Light scored 96 only because the intentionally white
Search label on exact `#825CFF` has the documented 4.26:1 contrast. Both runs
measured 1.3 s LCP. Their 0.035 CLS was attributed to the existing external
Alexandria web-font swap, not the theme controller. The selector adds no image,
font, or search-index request; its icons and palette are CSS and inline SVG.

The reviewed Google Fonts declarations and the exact Alexandria and LINE Seed
JP WOFF2 subsets are served from the first-party Cloudflare origin.
In a same-build A/B, local declarations reduced mobile LCP from a 1,958 ms
median to 1,204 ms and stylesheet transfer from 67,474 B to 34,714 B.
Font-loaded mobile and desktop screenshots, measured geometry, and ordered
results were pixel-identical to the pre-change baseline.

| Fast 3G / 4× CPU path | Before | Current median |
| --- | ---: | ---: |
| Initial C++ result completion | 7,820 ms | 7,753 ms |
| Initial search runtime | 5,563 ms | 2,737 ms |
| Source policy change | 5,323 ms | 751 ms |
| Source selection plus Search | 5,273 ms | 798 ms |
| Next same-language search | 5,268 ms | 780 ms |
| Unified language, cold | Separate controls | 3,762 ms |
| Unified language, worker-cached | Separate controls | 47 ms |
| Smooth back to top | 647 ms | 639 ms |

Client-handled GET forms retain the worker and parsed indexes without fetching
another HTML page, while preserving normal no-JavaScript GET behavior. The
alternate language's search request is
warmed only after pointer or keyboard intent; prefetch is disabled for
data-saver, 2G, and slow-2G connections. Search creates only the first 15 result
groups until the user requests another batch.

The unified cold measurement on 2026-07-28 waits for both search completion and
`document.fonts.ready`. Unlike the former Docs-only control, it also exposes
Japanese interface copy and therefore starts the required LINE Seed JP WOFF2
subsets. The font remains part of the visual contract; the cold budget includes
that real transfer rather than hiding it by changing or removing the typeface.

## 10,000 DAU Transfer Model

The model covers search-index JSON bodies only.
It excludes HTML, JavaScript, CSS, fonts, headers, TLS overhead, original
documentation traffic, and CDN request charges.
Use 30 days, 10,000 daily active users, and decimal provider GB.

`monthly transfer GB = response bytes × body-delivering visits ÷ 1,000,000,000`

`monthly transfer cost = monthly transfer GB × provider price per GB`

An upper-bound cold model delivers all 90 bundles and the manifest on every one
of 300,000 user-days:

| Encoding | Bytes per cold visit | Monthly transfer | Cost at provider rate `P` |
| --- | ---: | ---: | ---: |
| gzip | 2,470,593 B | 741.178 GB (690.28 GiB) | `741.178 × P` |
| Brotli | 1,903,224 B | 570.967 GB (531.76 GiB) | `570.967 × P` |

An ideal warm model assumes the same 10,000 browsers load all indexes once,
unchanged manifest revalidation returns a bodyless `304`, and no bundle changes:

| Encoding | Monthly body transfer | Cost at provider rate `P` |
| --- | ---: | ---: |
| gzip | 24.706 GB (23.01 GiB) | `24.706 × P` |
| Brotli | 19.032 GB (17.72 GiB) | `19.032 × P` |

At an illustrative USD 0.05/GB, the all-bundle model is about USD 37.06/month
cold with gzip or USD 28.55/month cold with Brotli, and about USD 1.24/month or
USD 0.95/month respectively in the ideal warm model.
At USD 0.10/GB those estimates double.
Replace the examples with the selected provider's allowance, egress rate, and
request pricing before release budgeting.

For realistic forecasting, use `T = Σ(C_i × S_i) + (R × M)`, where `C_i` is a
bundle's cold deliveries, `S_i` its encoded bytes, `R` body-returning manifest
responses, and `M` encoded manifest size.
Only changed content-addressed bundles selected by a client are redownloaded.

## Cache Decision

Use the browser HTTP cache:

- Content-addressed bundles receive `public, max-age=31536000, immutable`.
- The runtime and full manifests receive `no-cache, must-revalidate` and
  content-derived `ETag` validators.
- Cloudflare performs production edge compression for static assets without
  committed sidecars; middleware negotiates Workers gzip for private HTML while
  retaining `no-transform`.
- Valid direct queries preload the runtime manifest and at most four exact
  bundles under a 500 KiB Brotli planning ceiling.
- One page-lifetime Web Worker parses and searches compact tuples away from the
  main thread.
- The worker reuses the manifest and successfully loaded content-addressed
  bundles while the page remains open.
- The worker caches normalized searchable fields and a bounded set of recent
  result requests; debounced suggestions reuse the same worker and bundles.
- GET search and source-policy submissions resolve in the browser so the worker
  and parsed indexes survive, no query-page request is made, and URL, history,
  focus, and no-JavaScript behavior remain intact.
- An alternate-language pointer or focus intent warms the same worker request
  unless reduced-data connection signals prohibit it.
- Result-language and site filters re-search the selected subset through the
  same worker cache without a document request.
- Changing EN/JA updates the interface, URL, preference, notices, and preferred
  result language in place instead of loading a new document. An explicit
  `locale:` query continues to override only the result language.
- A fixed four-card loading skeleton reserves result space; its wave and
  centered indicator are CSS-only and stop under reduced motion.

Do not add IndexedDB or Cache API without an offline or measured retention need.
They duplicate the HTTP cache and add quota, eviction, schema, invalidation,
privacy, recovery, and service-worker lifecycle concerns.

The E2E gate uses a 390×800 viewport and 4× CPU throttling.
With Fast 3G and the browser cache disabled, the first Python EN-to-JA locale
switch must finish within 9,000 ms in the HTTP/1 workerd preview, including
the asynchronously requested, uncompressed LINE Seed JP face catalog and its
newly requested subsets. The catalog no longer blocks an English first paint.
Re-audit the deployed HTTP/2 or HTTP/3 origin, where the stylesheet is
compressed, against the unchanged 4,500 ms production target.
A repeated switch to a bundle already held by the worker must finish within
500 ms with no search-time Long Task over 50 ms.

Before in-page switching, the Python EN-to-JA interaction took 3,956 ms under
those conditions.
The former independent Docs-only control measured 1,127 ms cold and 65 ms
worker-cached. The unified interface/documentation control measured 3,762 ms
cold with font completion and 47 ms worker-cached on 2026-07-28; the added cold
time is concurrent Japanese interface-font delivery, not a document navigation
or main-thread search regression.

## Verification Cost

Before change-aware selection, the successful 2026-07-25 GitHub Actions run
took 87 seconds.
The verification step took about 53 seconds, including about 39 seconds of
browser E2E, and production output was built three times.
Documentation-only changes still paid Node setup and `npm ci`.

Verification now classifies the exact changed paths before Node setup.
Documentation-only CI selects no Node phase.
Focused filter, layout, and performance browser runs measured about 10, 11, and
12 seconds locally, compared with about 32 seconds for the complete browser
file.
One production build is shared by selected browser and server-contract phases.

Live index work is selected independently by source family.
On 2026-07-25, a single `gfortran/en` regeneration took about 125 seconds and
its selected live-link check took about 35 seconds under GCC's access
constraints.
Unrelated changes now make zero GCC requests.
Weekly refresh excludes the monthly GNU group, and scheduled update no longer
regenerates the same upstream selection twice.
