# Decision

## Title

Bundle the reviewed Google Fonts face declarations locally

## Date

2026-07-28

## Status

Accepted

## Decision

Keep Alexandria and LINE Seed JP, their existing weights, Unicode subsets,
`font-display: swap`, and Google-hosted WOFF2 files unchanged.

Commit the reviewed `@font-face` stylesheet as `src/font-faces.css` and bundle
it with the application's content-hashed CSS. Keep the early connection hint
for `fonts.gstatic.com`. Refresh the stylesheet only through
`npm run update:font-css` and review its generated diff.

## Context

The Google Fonts CSS endpoint was a render-blocking cross-origin dependency.
Five-run mobile Lighthouse A/B tests measured a 1,958 ms LCP median through the
remote stylesheet and 1,210 ms when the same declarations were served locally.
Self-hosting all font binaries was also tested, but did not improve consistently
under the production server's connection model.

## Alternatives

- Keep both the CSS and font files on Google Fonts.
- Self-host all referenced WOFF2 files.
- Remove, defer, or replace the product fonts.

## Reason

Local CSS removes one cross-origin request and reduces compressed stylesheet
transfer while preserving the exact font files and rendering contract. Loaded
screenshots, layout geometry, and ordered results were pixel-identical at
mobile and desktop sizes.

## Consequences

- The generated CSS is a reviewed product asset and must remain committed.
- Font binaries continue to use Google's cache and multiplexed delivery.
- A font refresh is intentional rather than an unreviewed runtime change.
- E2E checks protect the family and weight contract.

## Revisit Conditions

Revisit if the font families or weights change, Google stops serving one of the
pinned WOFF2 URLs, a production CDN makes exact self-hosting measurably faster,
or visual-equivalence checks no longer pass.
