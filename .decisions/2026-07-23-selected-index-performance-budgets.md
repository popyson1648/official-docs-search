# Decision

## Title

Budget search-index delivery by bundle and selected working set

## Date

2026-07-23

## Status

Accepted

## Decision

Replace the fixed budget for the sum of every supported search bundle with
budgets that match runtime loading:

- Each individual Brotli-11 bundle must remain below 750,000 bytes unless a
  separately reviewed source-specific exception explains why splitting it would
  harm search quality.
- The default English working set for the first four catalog languages must
  remain below 1,000,000 Brotli-11 bytes.
- A representative four-language working set built from the largest supported
  bundles must remain below 2,000,000 Brotli-11 bytes.
- A warm mobile-emulated search keeps the existing 500 ms completion target and
  must not create a search-derived Long Task over 50 ms.
- The sum of all bundles remains a measured release and transfer-cost metric,
  but it is not a request-size gate because the browser does not fetch all
  language bundles for one scoped search.

Keep content-addressed HTTP caching, manifest revalidation, and worker-based
search unchanged.
Record current raw, gzip, and Brotli totals after every coverage expansion.

## Context

The original integration gate required all 13 supported bundles together to
remain below one Brotli megabyte.
Expanding the catalog to every programming language makes that aggregate limit
both unattainable and unrelated to the actual selected-bundle loading model.

Removing size gates entirely would allow one source or a common selection to
grow without review.
Simply increasing the all-bundle ceiling would still test an artificial
request.

## Alternatives

- Keep a larger all-bundle cap: rejected because users fetch selected source and
  locale bundles, not the whole catalog.
- Remove compressed-size gates: rejected because a single oversized bundle can
  still harm cold-start transfer and parse time.
- Split every source mechanically: rejected because source-specific shards add
  request overhead and require a stable routing contract.
- Add a hosted search service: rejected because the current browser-search
  architecture remains within the selected working-set budgets.

## Reason

Per-bundle and selected-set budgets measure the transfer and parse work a real
search can incur.
The aggregate snapshot remains useful for hosting-cost projections without
blocking unrelated catalog growth.

## Consequences

- Integration tests calculate individual, default-set, and largest-set sizes.
- Performance documentation reports both request-shaped budgets and full
  catalog totals.
- A bundle over 750,000 Brotli-11 bytes requires review for filtering, a more
  compact record shape, or source-specific sharding.
- New default sources must be evaluated against the one-megabyte default-set
  limit.
- Browser performance checks remain required as record counts increase.

## Revisit Conditions

- Production telemetry shows a common selected set larger than the
  representative test.
- One maintained official source cannot fit the per-bundle limit.
- Worker search misses the warm latency or Long Task target.
- Search bundles are sharded or moved to a server-side index.
