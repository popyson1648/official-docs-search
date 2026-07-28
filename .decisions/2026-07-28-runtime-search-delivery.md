# Decision

## Title

Use a client-only runtime manifest and build-time compressed indexes

## Date

2026-07-28

## Status

Accepted

## Decision

Keep `manifest.json` as the complete canonical provenance record and generate a
deterministic `runtime-manifest.json` beside it. The runtime projection contains
only manifest identity, source selection, support state, bundle identity,
result classification, and visible qualification fields used by browser search.

During the production build, create Brotli quality 11 and gzip level 9
sidecars for every search-index JSON file. Serve the negotiated sidecar while
preserving the decoded bytes, content-derived validator, cache policy, `Vary`,
`HEAD`, and conditional response behavior.

## Context

Browser search previously downloaded the complete 151,390-byte provenance
manifest and the server recompressed large indexes on every body response.
Cached parsed bundles were also fully validated on every search.

## Alternatives

- Continue sending the complete manifest to the browser.
- Remove provenance fields from the canonical manifest.
- Compress every response dynamically.
- Add persistent browser storage or a service worker.

## Reason

The runtime manifest is 40,972 bytes raw and 5,798 bytes with production
Brotli, 79.1% smaller than the complete manifest's compressed form. Build-time
sidecars reduce the normal all-bundle Brotli body by about 17% compared with
dynamic quality 5 and remove request-time compression work.

All known queries plus C++ exact, fuzzy, locale, and source-policy matrices
produce deeply equal runtime results through the complete and projected
manifests. Every sidecar decompresses byte-for-byte to its source JSON.

## Consequences

- Both manifests are committed and generated together; the complete manifest
  remains the final publication commit point.
- Check mode rejects a stale runtime projection.
- The client fully validates each parsed bundle once, then performs only
  constant-time identity checks while reusing it.
- Production builds take several additional seconds to create sidecars, which
  remain under ignored `dist/` output and are never committed.

## Revisit Conditions

Revisit if the client begins consuming a removed provenance field, if manifest
equivalence tests diverge, if the hosting platform performs demonstrably better
static compression itself, or if offline search becomes a product requirement.
