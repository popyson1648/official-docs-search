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
| All bundles, production settings (gzip 6 / Brotli 5) | 18,007,350 B | 2,493,911 B | 2,260,710 B |
| Manifest, production settings | 151,390 B | 35,157 B | 32,594 B |
| All-bundle cold response including manifest | 18,158,740 B | 2,529,068 B | 2,293,304 B |

Manifest size fields use deterministic maximum-quality compression for
regression checks.
Production transfer estimates use the server settings.
Automated budgets require every bundle to remain below 750,000 Brotli-11 bytes,
the default four-language English official set below 1,000,000 bytes, and the
largest one-bundle set from four distinct languages below 2,000,000 bytes.
The current sets are 382,486 B and 601,284 B respectively.

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
| gzip | 2,529,068 B | 758.720 GB (706.61 GiB) | `758.720 × P` |
| Brotli | 2,293,304 B | 687.991 GB (640.74 GiB) | `687.991 × P` |

An ideal warm model assumes the same 10,000 browsers load all indexes once,
unchanged manifest revalidation returns a bodyless `304`, and no bundle changes:

| Encoding | Monthly body transfer | Cost at provider rate `P` |
| --- | ---: | ---: |
| gzip | 25.291 GB (23.55 GiB) | `25.291 × P` |
| Brotli | 22.933 GB (21.36 GiB) | `22.933 × P` |

At an illustrative USD 0.05/GB, the all-bundle model is about USD 37.94/month
cold with gzip or USD 34.40/month cold with Brotli, and about USD 1.26/month or
USD 1.15/month respectively in the ideal warm model.
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
- The manifest receives `no-cache, must-revalidate` and a content-derived `ETag`.
- Both negotiate gzip/Brotli and send `Vary: Accept-Encoding`.
- One page-lifetime Web Worker parses and searches compact tuples away from the
  main thread.
- The worker reuses the manifest and successfully loaded content-addressed
  bundles while the page remains open.
- The worker caches normalized searchable fields and a bounded set of recent
  result requests; debounced suggestions reuse the same worker and bundles.
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
