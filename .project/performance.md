# Performance

## Current Snapshot

The 2026-07-24 manifest contains 85 supported bundles for 44 languages, 17
Japanese bundles, and 175,812 records.
Search normally fetches only bundles selected by language, source mode, and
requested Docs locale; all-bundle totals are a conservative catalog-wide upper
bound.

| Payload | Raw | gzip | Brotli |
| --- | ---: | ---: | ---: |
| All bundles, generator regression settings (gzip 9 / Brotli 11) | 14,615,433 B | 1,951,307 B | 1,512,615 B |
| All bundles, production settings (gzip 6 / Brotli 5) | 14,615,433 B | 1,975,165 B | 1,797,594 B |
| Manifest, production settings | 121,345 B | 28,673 B | 26,677 B |
| All-bundle cold response including manifest | 14,736,778 B | 2,003,838 B | 1,824,271 B |

Manifest size fields use deterministic maximum-quality compression for
regression checks.
Production transfer estimates use the server settings.
Automated budgets require every bundle to remain below 750,000 Brotli-11 bytes,
the default four-language English official set below 1,000,000 bytes, and the
largest one-bundle set from four distinct languages below 2,000,000 bytes.
The current sets are 358,186 B and 539,940 B respectively.

## 10,000 DAU Transfer Model

The model covers search-index JSON bodies only.
It excludes HTML, JavaScript, CSS, fonts, headers, TLS overhead, original
documentation traffic, and CDN request charges.
Use 30 days, 10,000 daily active users, and decimal provider GB.

`monthly transfer GB = response bytes × body-delivering visits ÷ 1,000,000,000`

`monthly transfer cost = monthly transfer GB × provider price per GB`

An upper-bound cold model delivers all 85 bundles and the manifest on every one
of 300,000 user-days:

| Encoding | Bytes per cold visit | Monthly transfer | Cost at provider rate `P` |
| --- | ---: | ---: | ---: |
| gzip | 2,003,838 B | 601.151 GB (559.87 GiB) | `601.151 × P` |
| Brotli | 1,824,271 B | 547.281 GB (509.70 GiB) | `547.281 × P` |

An ideal warm model assumes the same 10,000 browsers load all indexes once,
unchanged manifest revalidation returns a bodyless `304`, and no bundle changes:

| Encoding | Monthly body transfer | Cost at provider rate `P` |
| --- | ---: | ---: |
| gzip | 20.038 GB (18.66 GiB) | `20.038 × P` |
| Brotli | 18.243 GB (16.99 GiB) | `18.243 × P` |

At an illustrative USD 0.05/GB, the all-bundle model is about USD 30.06/month
cold with gzip or USD 27.36/month cold with Brotli, and about USD 1.00/month or
USD 0.91/month respectively in the ideal warm model.
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
- Result-language and site filters re-search the selected subset through the
  same worker cache without a document request.
- Changing the Docs locale updates the URL, preference, notices, and results in
  place instead of loading a new document.

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
