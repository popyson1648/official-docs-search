# Decision

## Title

Serve production from `langref-search.popyson.com`

## Date

2026-07-30

## Status

Accepted

## Decision

The production origin is `https://langref-search.popyson.com`, attached to the
`langref-search` Worker as a Cloudflare custom domain. The previous
`official-docs-search.popyson.com` custom domain is detached without a redirect.

## Context

The service is named LangRef Search, but its first deployment used the earlier
project name in the hostname. The interface, metadata, and Worker name already
use the product name, and the site had been public for less than a day, so
almost no external links or indexed URLs exist.

## Alternatives

- Keep the previous hostname: leaves the product name inconsistent with its own
  origin and every absolute URL it publishes.
- Keep both hostnames with a 301 redirect from the previous one: preserves any
  early links, but keeps a second certificate, route, and canonical-host risk
  for a site with effectively no inbound links.

## Reason

The origin is part of the product identity and appears in canonical, `hreflang`,
Open Graph, robots, sitemap, and legal-page URLs. Renaming now, before links
accumulate, avoids carrying a duplicate host indefinitely.

## Consequences

- `astro.config.mjs`, `wrangler.jsonc`, the robots/sitemap/metadata fallbacks,
  the contract and browser tests, and `.project/` documentation use the new
  origin.
- The previous hostname stops resolving; existing links to it break.
- Wrangler cannot delete a Worker custom domain, so detaching the previous
  hostname and removing its DNS record is a dashboard or API action.
- The issue-report Google Form's collection notice must be edited by the
  operator to reference the new privacy-policy URL.

## Revisit Conditions

Revisit if the service is renamed again, moves to its own apex domain, or gains
enough inbound links that dropping a hostname would lose real traffic.
