# Decision

## Title

Use Google Programmable Search Element for the first production search provider

## Date

2026-06-19

## Status

Accepted

## Decision

Use Google Programmable Search Element instead of paid web search APIs or the closed Custom Search JSON API.
Generate Google Programmable Search configuration files from `src/data/docs-sources.toml`.

## Context

The service should be free, safe, stable, and easy to operate.
The Custom Search JSON API is closed to new customers.
Hosted search APIs introduce pricing uncertainty.
Self-hosted indexing avoids API fees but requires crawler maintenance, robots policy review, update scheduling, and index quality work.

## Alternatives

- Google Custom Search JSON API: rejected because it is closed to new customers.
- Brave, Exa, Tavily, or similar APIs: rejected for the initial version because free production operation is uncertain.
- Self-hosted Pagefind or Meilisearch index: deferred because crawler/index operations are the larger maintenance burden.

## Reason

Google Programmable Search Element can run without an API key, can be free with ads, and is backed by Google Search.
The app keeps its own query parser, source catalog, source selection UI, and hidden site constraints.
The Google control-panel configuration is generated from TOML, avoiding manual site entry.

## Consequences

- The public site needs `PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX`.
- Results are rendered by Google's element script, not by a custom server-side result renderer.
- The visible search input remains clean; generated `site:` constraints are not shown to the user.
- `public/search/context.xml` and `public/search/annotations.xml` must be uploaded to Google Programmable Search Engine when the catalog changes.

## Revisit Conditions

- Google Programmable Search Element becomes unavailable or unsuitable.
- Ads are unacceptable for the product.
- Search quality or source restriction is not good enough.
- The project needs fully custom result rendering or offline indexing.
