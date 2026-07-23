# Performance

## Current Snapshot

The 2026-07-23 manifest contains 13 supported bundles, 119,446 records, and 9,911,772 raw bundle bytes.
The browser fetches only bundles selected by source and Docs locale, so the all-bundle totals below are a conservative upper bound for one search.

| Payload | Raw | gzip | Brotli |
| --- | ---: | ---: | ---: |
| All bundles, generator size settings (gzip 9 / Brotli 11) | 9,911,772 B | 1,201,470 B | 898,775 B |
| All bundles, production settings (gzip 6 / Brotli 5) | 9,911,772 B | 1,218,011 B | 1,090,899 B |
| Manifest, production settings | 31,635 B | 5,839 B | 5,525 B |
| All-bundle cold response including manifest | 9,943,407 B | 1,223,850 B | 1,096,424 B |

Manifest size fields use maximum-quality deterministic compression for regression checks.
Transfer estimates use the production server settings.
Integration tests keep the initial five bundles below 1,000,000 gzip bytes and all 13 bundles below 1,000,000 Brotli-11 bytes.

## 10,000 DAU Transfer Model

The model covers search-index JSON response bodies only.
It excludes HTML, JavaScript, CSS, fonts, headers, TLS overhead, original documentation traffic, and CDN request charges.
Use 30 days, 10,000 daily active users, and decimal provider GB.

For encoding `e`:

`monthly transfer GB = response bytes(e) × body-delivering visits ÷ 1,000,000,000`

`monthly transfer cost = monthly transfer GB × provider price per GB`

An upper-bound cold model assumes all 13 bundles and the manifest are delivered on every one of 300,000 user-days:

| Encoding | Bytes per cold visit | Monthly transfer | Cost at provider rate `P` |
| --- | ---: | ---: | ---: |
| gzip | 1,223,850 B | 367.155 GB (341.94 GiB) | `367.155 × P` |
| Brotli | 1,096,424 B | 328.927 GB (306.34 GiB) | `328.927 × P` |

An ideal warm model assumes the same 10,000 browsers return daily, load all indexes once, receive `304` with no body for unchanged manifest revalidation, and encounter no index update:

| Encoding | Monthly body transfer | Cost at provider rate `P` |
| --- | ---: | ---: |
| gzip | 12.239 GB (11.40 GiB) | `12.239 × P` |
| Brotli | 10.964 GB (10.21 GiB) | `10.964 × P` |

For planning only, at an illustrative transfer rate of USD 0.05/GB, the
all-bundle model is about USD 18.36/month cold with gzip or USD 16.45/month cold
with Brotli, and about USD 0.61/month or USD 0.55/month respectively in the ideal
warm model.
At USD 0.10/GB those estimates double.
Replace these examples with the selected provider's actual included allowance,
egress rate, and request pricing before release budgeting.

For a realistic forecast, sum only the selected bundle sizes.
Let `C_i` be monthly cold deliveries of bundle `i`, `S_i` its encoded bytes, `M` the manifest bytes returned with a body, and `R` the number of manifest `200` responses.
Then `T = Σ(C_i × S_i) + (R × M)`.
An index update changes only affected content-addressed paths, so warm clients redownload only changed bundles they select.

## Cache Decision

Use the browser HTTP cache:

- Content-addressed bundle paths receive `public, max-age=31536000, immutable`.
- The manifest receives `no-cache, must-revalidate` and a content-derived `ETag`.
- Both negotiate gzip/Brotli and send `Vary: Accept-Encoding`.
- A Web Worker performs JSON parsing and tuple scanning away from the main thread.

Do not add IndexedDB or Cache API now.
They would duplicate the HTTP cache, add quota and eviction behavior, require schema and invalidation code, and complicate privacy and failure recovery without an offline requirement.
Cache API would also require service-worker lifecycle management.

Revisit app-managed storage if offline search becomes a requirement, repeat parsing fails the warm 500 ms target, or measured transfer shows the native cache is not retained.
The E2E performance gate uses a 390×800 viewport and 4× CPU throttling; a warm Python-plus-Rust search must finish within 500 ms with no search-time Long Task over 50 ms.
