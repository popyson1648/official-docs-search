# Performance

## Current Snapshot

The 2026-07-27 manifest contains 90 supported bundles for 44 languages, 18
Japanese bundles, and 202,404 records.
Search normally fetches only bundles selected by language, source mode, and
requested Docs locale; all-bundle totals are a conservative catalog-wide upper
bound.

| Payload | Raw | gzip | Brotli |
| --- | ---: | ---: | ---: |
| All bundles, generator regression settings (gzip 9 / Brotli 11) | 18,007,350 B | 2,463,438 B | 1,897,426 B |
| Runtime manifest, production sidecars (gzip 9 / Brotli 11) | 40,972 B | 7,155 B | 5,798 B |
| All-bundle cold response including runtime manifest | 18,048,322 B | 2,470,593 B | 1,903,224 B |
| Full manifest, production sidecars (not fetched by search) | 151,390 B | 34,620 B | 27,742 B |

Manifest size fields use deterministic maximum-quality compression for
regression checks.
Production transfer estimates use the precompressed build sidecars.
Automated budgets require every bundle to remain below 750,000 Brotli-11 bytes,
the default four-language English official set below 1,000,000 bytes, and the
largest one-bundle set from four distinct languages below 2,000,000 bytes.
The current sets are 382,486 B and 601,284 B respectively.

## Page And Interaction Snapshot

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

The reviewed Google Fonts declarations are bundled locally while the exact
Alexandria and LINE Seed JP WOFF2 files remain on `fonts.gstatic.com`.
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
| Docs locale, cold | 1,205 ms | 1,127 ms |
| Docs locale, worker-cached | 54 ms | 65 ms |
| UI language | 54 ms | 74 ms |
| Smooth back to top | 647 ms | 639 ms |

Client-routed GET forms retain the worker and parsed indexes while preserving
normal no-JavaScript GET behavior. A non-selected Docs locale is warmed only
after pointer or keyboard intent; prefetch is disabled for data-saver, 2G, and
slow-2G connections. Search creates only the first 15 result groups until the
user requests another batch.

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
- Manifests and bundles use maximum-compression gzip/Brotli sidecars and send
  `Vary: Accept-Encoding`.
- One page-lifetime Web Worker parses and searches compact tuples away from the
  main thread.
- The worker reuses the manifest and successfully loaded content-addressed
  bundles while the page remains open.
- The worker caches normalized searchable fields and a bounded set of recent
  result requests; debounced suggestions reuse the same worker and bundles.
- GET search and source-policy submissions use client routing so the worker and
  parsed indexes survive while URL, history, focus, and no-JavaScript behavior
  remain intact.
- A Docs-locale pointer or focus intent warms the same worker request unless
  reduced-data connection signals prohibit it.
- Result-language and site filters re-search the selected subset through the
  same worker cache without a document request.
- Changing the Docs locale updates the URL, preference, notices, and results in
  place instead of loading a new document.
- A fixed four-card loading skeleton reserves result space; its wave and
  centered indicator are CSS-only and stop under reduced motion.

Do not add IndexedDB or Cache API without an offline or measured retention need.
They duplicate the HTTP cache and add quota, eviction, schema, invalidation,
privacy, recovery, and service-worker lifecycle concerns.

The E2E gate uses a 390×800 viewport and 4× CPU throttling.
With Fast 3G and the browser cache disabled, the first Python EN-to-JA locale
switch must finish within 1,500 ms.
A repeated switch to a bundle already held by the worker must finish within
500 ms with no search-time Long Task over 50 ms.

Before in-page switching, the Python EN-to-JA interaction took 3,956 ms under
those conditions.
The implementation measurement on 2026-07-24 was 1,364 ms for the first switch
and 80 ms for the repeated switch.

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
