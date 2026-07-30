# Decision

## Title

Self-host the reviewed Google Fonts WOFF2 subsets

## Date

2026-07-30

## Status

Accepted

## Decision

Preserve the existing Alexandria and LINE Seed JP families, weights, Unicode
subsets, and `font-display: swap` behavior, but serve every WOFF2 binary from
the first-party `/fonts/google/` path.

The update script downloads the reviewed stylesheet, validates its families and
weights, downloads and verifies all WOFF2 files, rewrites URLs, and stores the
upstream OFL license files. Font assets use a one-year immutable cache policy.

## Context

The earlier decision kept WOFF2 files on `fonts.gstatic.com` because local Node
delivery did not improve consistently. The production target is now a global
CDN, and removing the third-party browser request simplifies the privacy model.
The complete set is about 4.1 MiB across 252 Unicode subsets.

## Alternatives

- Continue loading font binaries from Google.
- Replace the product fonts with system fonts.
- Reduce language coverage or font weights.

## Reason

First-party CDN delivery removes a third-party connection without changing
typography. Unicode ranges ensure a browser downloads only the subsets required
by the page, while immutable caching avoids repeat transfer.

## Consequences

- About 4.7 MiB of generated font files and license text are committed.
- Font updates require `npm run update:font-css` and a reviewed generated diff.
- Tests verify the local files, font families, weights, and absence of remote
  font URLs.

## Revisit Conditions

Revisit if typography changes, the font licenses change, asset-count limits
become material, or real-user measurements show that another delivery strategy
is faster without adding a privacy regression.
