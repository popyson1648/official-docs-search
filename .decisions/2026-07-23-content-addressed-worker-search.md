# Decision

## Title

Use content-addressed HTTP caching and a Web Worker for browser search

## Date

2026-07-23

## Status

Accepted

## Decision

Write each compact search bundle to a filename containing the first 16
hexadecimal characters of its SHA-256 content hash.
Publish all bundles before publishing the manifest.
Serve hashed bundles with a one-year `immutable` cache policy, serve the manifest
with revalidation, and emit stable content ETags plus
`Vary: Accept-Encoding`.
Support Brotli, gzip, and identity responses in the production Node server.

Load only the source and locale bundles selected by the request.
Parse and search their compact tuples in a Web Worker, keep the worker's bundle
promises in memory for the page lifetime, and materialize only bounded matching
records.
Rely on the browser HTTP cache for reuse across navigations.
Do not add IndexedDB or Cache API storage yet.

## Context

The original bundles used stable filenames, expanded every tuple into an object,
and searched on the main thread.
That prevented safe immutable caching and made large indexes a responsiveness
risk as adapter coverage grew.
The application needs predictable transfer and latency for approximately 10,000
daily users without adding a hosted search service.

## Alternatives

- Revalidate every stable bundle path: rejected because unchanged large bundles
  would still need network validation and could not use a long immutable policy.
- Store bundles in IndexedDB or the Cache API: deferred because content-addressed
  HTTP caching already avoids unchanged transfers, while application-managed
  storage adds quota, eviction, migration, and duplicate-storage complexity.
- Search expanded records on the main thread: rejected because parsing and
  scanning large selected bundles can create user-visible long tasks.
- Add a hosted search backend: rejected because current scale does not justify
  per-query cost and operational ownership.

## Reason

Content hashes make bundle identity equal to content identity.
A small revalidated manifest can safely point to immutable data, so unchanged
indexes remain cache hits.
Worker execution isolates JSON parsing and tuple scanning from input and
rendering, while bounded result construction limits allocation.

## Consequences

- The manifest must be published last and must never reference a missing bundle.
- Production compression and cache headers are contract-tested.
- A changed bundle gets a new URL; an unchanged bundle retains its URL and ETag.
- Performance tests require no search-derived long task over 50 ms and a warm
  mobile-emulated result time within 500 ms.
- Transfer assumptions and provider-neutral cost formulas are maintained in
  `.project/performance.md`.

## Revisit Conditions

- Production telemetry shows repeated downloads despite correct HTTP caching.
- Browser storage would materially improve offline behavior or transfer cost.
- A selected-bundle workload exceeds the worker latency or memory budgets.
- Hosting transfer cost becomes higher than a hosted search alternative.
