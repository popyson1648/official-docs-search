# Performance

## Current Snapshot

Record the manifest date, supported bundle and record counts, raw bytes,
generator gzip/Brotli sizes, CDN transfer sizes, and compressed runtime
and full manifest sizes.
State that selected bundles, not the complete catalog, are normally fetched.
Keep generator regression sizes separate from production transfer sizes.
Record per-bundle, default selected-set, and largest representative selected-set
budgets with their current measurements.

Record five-run mobile and desktop Lighthouse medians and ranges, constrained
interaction medians, transfer, TBT, CLS, and whether field data was available.
For font-delivery experiments, record the exact family/weight contract, the
A/B result, and font-loaded visual and geometry equivalence.

## 10,000 DAU Transfer Model

Model search-index JSON bodies separately from HTML, application assets, headers, TLS, original documentation traffic, and request charges.
Use 30 days and decimal provider GB unless the hosting contract specifies otherwise.

`monthly transfer GB = response bytes × body-delivering visits ÷ 1,000,000,000`

`monthly transfer cost = monthly transfer GB × provider price per GB`

Publish both:

- A cold upper bound: all supported selected bundles plus the runtime manifest
  on all 300,000 user-days.
- An ideal warm bound: the same 10,000 browsers load once, unchanged runtime
  manifest requests return bodyless `304`, and no bundle changes.

Include clearly labeled illustrative costs at one or more provider-neutral
per-GB rates.
Replace them with the selected provider's included allowance, egress rate, and
request pricing before release budgeting.

For realistic forecasting, use `T = Σ(C_i × S_i) + (R × M)`, where `C_i` is cold deliveries of bundle `i`, `S_i` is its encoded size, `R` is body-returning manifest responses, and `M` is encoded manifest size.
Account for updates only on changed content-addressed bundles selected by each client.

## Cache Decision

Prefer native HTTP caching for content-addressed bundles:

- One-year immutable caching for hashed bundles.
- Revalidation plus content-derived `ETag` for both manifests.
- Cloudflare edge compression without committed precompressed sidecars.
- One page-lifetime worker for JSON parsing and compact-tuple search off the
  main thread, with manifest and loaded-bundle reuse.
- Cached normalized searchable fields and bounded recent result reuse for
  debounced suggestions and repeated queries.
- In-page result filters that re-search selected cached bundles without a
  document request.
- In-page unified interface/documentation-language changes instead of loading a
  new document, with an explicit query-level documentation-locale override
  where needed.

Defer IndexedDB and Cache API while they duplicate native caching and add quota, eviction, schema, invalidation, service-worker, privacy, and recovery complexity without an offline requirement.
Revisit for offline search, failed warm-latency targets, or evidence that native caching is not retained.

Record the mobile viewport, CPU and network throttling, first-switch and
worker-cached switch targets, and Long Task threshold used by automated browser
verification. Include font requests caused by newly visible localized copy when
typography is part of the product contract.
Record whether the loading state reserves stable result space and whether its
motion is CSS-only and suppressed for reduced-motion preferences.

## Verification Cost

Record the full CI duration and the dominant phases before and after
change-aware selection.
Include documentation-only startup cost, full and concern-specific browser
durations, repeated-build elimination, and representative source-scoped live
times.
State which slow upstream groups are scheduled separately and confirm that
unrelated changes make no request to them.
