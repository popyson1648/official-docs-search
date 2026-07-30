# Decision

## Title

Serve production from the `langrefsearch.com` apex domain

## Date

2026-07-31

## Status

Accepted

## Decision

Production is `https://langrefsearch.com`, attached to the `langref-search`
Worker as a Cloudflare custom domain on the operator's `langrefsearch.com` zone.
This supersedes
[2026-07-30-langref-search-production-domain](2026-07-30-langref-search-production-domain.md),
whose `langref-search.popyson.com` hostname was configured but never deployed.
The previously deployed `official-docs-search.popyson.com` custom domain and its
DNS record are removed without a redirect.

## Context

The service had been reachable only under the operator's personal domain. The
operator registered `langrefsearch.com`, which matches the product name, and the
zone is already active in the same Cloudflare account. The only public
deployment so far used `official-docs-search.popyson.com` for about one day.

## Alternatives

- Keep a subdomain of `popyson.com`: ties a named product to a personal domain
  and forces every published URL, including the ones in the legal pages and the
  indexer user agent, to carry it.
- Redirect the retired hostname: preserves any early links, but keeps a second
  certificate and route for a site whose inbound links are effectively none.
- Serve from `www.langrefsearch.com`: adds a hostname without adding value for a
  single-page search service.

## Reason

The apex of a product-named domain is the shortest stable identity for a service
whose origin appears in canonical, `hreflang`, Open Graph, robots, sitemap, legal
pages, and the crawler's contact string. Making the change while the previous
hostname is one day old avoids carrying a redirect indefinitely.

## Consequences

- `astro.config.mjs`, `wrangler.jsonc`, the robots/sitemap/metadata fallbacks,
  the contract and browser tests, and `.project/` documentation use the apex.
- The indexer user agent becomes
  `langref-search-indexer/0.4 (+https://langrefsearch.com/)` so upstream
  operators reach a hostname that resolves.
- `official-docs-search.popyson.com` stops resolving; links to it break.
- The issue-report Google Form's collection notice must be edited by the operator
  to reference `https://langrefsearch.com/privacy`.
- `www.langrefsearch.com` is not configured.

## Revisit Conditions

Revisit if the service adds hostnames for staging or regional deployments, if a
`www` host becomes necessary, or if the product is renamed again.
