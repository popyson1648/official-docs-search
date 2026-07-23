# Performance

## Current Snapshot

Record the manifest date, supported bundle and record counts, raw bytes, generator gzip/Brotli sizes, production gzip/Brotli sizes, and compressed manifest size.
State that selected bundles, not the complete catalog, are normally fetched.
Keep generator regression sizes separate from production transfer sizes.

## 10,000 DAU Transfer Model

Model search-index JSON bodies separately from HTML, application assets, headers, TLS, original documentation traffic, and request charges.
Use 30 days and decimal provider GB unless the hosting contract specifies otherwise.

`monthly transfer GB = response bytes × body-delivering visits ÷ 1,000,000,000`

`monthly transfer cost = monthly transfer GB × provider price per GB`

Publish both:

- A cold upper bound: all supported selected bundles plus the manifest on all 300,000 user-days.
- An ideal warm bound: the same 10,000 browsers load once, unchanged manifest requests return bodyless `304`, and no bundle changes.

Include clearly labeled illustrative costs at one or more provider-neutral
per-GB rates.
Replace them with the selected provider's included allowance, egress rate, and
request pricing before release budgeting.

For realistic forecasting, use `T = Σ(C_i × S_i) + (R × M)`, where `C_i` is cold deliveries of bundle `i`, `S_i` is its encoded size, `R` is body-returning manifest responses, and `M` is encoded manifest size.
Account for updates only on changed content-addressed bundles selected by each client.

## Cache Decision

Prefer native HTTP caching for content-addressed bundles:

- One-year immutable caching for hashed bundles.
- Revalidation plus content-derived `ETag` for the manifest.
- gzip/Brotli negotiation with `Vary: Accept-Encoding`.
- Worker-based JSON parsing and compact-tuple search off the main thread.

Defer IndexedDB and Cache API while they duplicate native caching and add quota, eviction, schema, invalidation, service-worker, privacy, and recovery complexity without an offline requirement.
Revisit for offline search, failed warm-latency targets, or evidence that native caching is not retained.

Record the mobile viewport, CPU throttling, warm latency target, and Long Task threshold used by automated browser verification.
