# Decision

## Title

Replace Google Programmable Search with federated browser-side documentation indexes

## Date

2026-07-23

## Status

Accepted

## Decision

Generate compact per-source and per-locale title indexes from official documentation search data or maintained DevDocs indexes, serve them as static assets, and combine and rank all selected bundles in the browser.

## Context

Google Programmable Search imposed domain limits and sometimes returned no usable results.
The product requires one result list spanning every selected language, with each original page available in a separate tab, at a scale where per-query search API charges are undesirable.

## Alternatives

- Google Programmable Search with multiple engines or long domain constraints.
- Paid Brave, Bing, or other Web-search APIs.
- Sending users to separate official-site search pages.
- Crawling and republishing complete documentation content.

## Reason

Static indexes have no per-query fee, avoid search-provider domain limits, preserve one combined list, and keep navigation on original documentation sites.
Adapter and query complexity is acceptable compared with recurring API cost and provider restrictions.

## Consequences

- Each catalog source needs a maintained, tested adapter before it is searchable.
- Unsupported sources must be reported explicitly.
- Releases carry static-index bandwidth, mitigated by per-source loading and compact tuple storage.
- Live generation and known-query tests are required so empty upstream data cannot pass verification.

## Revisit Conditions

Revisit if static-index bandwidth or browser search latency becomes more expensive than a hosted index, or if upstream licenses no longer permit storing titles, headings, and original URLs.
