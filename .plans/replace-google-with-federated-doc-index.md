# Plan

## Goal

Replace Google Programmable Search with a zero-per-query-cost federated documentation index that returns one combined result list for all selected languages and sources and links every result to its original documentation page.

## Scope

- Add a provider-independent search-record format and deterministic ranking/filtering.
- Build language/source index bundles from maintained documentation indexes, starting with Python, Rust, and JavaScript as a production-shaped vertical slice.
- Prefer existing documentation indexes or DevDocs-compatible data over crawling every page.
- Load only the selected language bundles in the browser and merge their results automatically.
- Preserve official-only, optional conventional/community sources, source selection, UI language, and Docs locale behavior.
- Open every result in a new tab with safe link attributes.
- Remove the runtime dependency on Google CX for supported indexed sources.
- Add coverage and live-data verification that fails when known indexed queries return no result.

## Non-goals

- Reimplementing a general Web search engine.
- Republishing complete third-party documentation pages.
- Claiming complete catalog coverage before each source has a verified adapter and smoke query.
- Merging automatically.

## Assumptions

- The product value is a combined, trustworthy result list across selected programming languages, not the use of a particular Web-search provider.
- Search complexity and catalog-management complexity are acceptable when they avoid per-query fees and provider constraints.
- Initial implementation will prove the complete user flow on Python, Rust, and JavaScript, while unsupported sources are reported explicitly rather than silently returning empty results.
- Existing unrelated working-tree changes are preserved.

## Steps

1. Inspect live DevDocs and official index formats for the first three languages and record the selected ingestion contract.
2. Implement normalized records, index generation, source coverage metadata, deterministic ranking, filters, and result diversification.
3. Generate static per-language index bundles and validate known results and original URLs.
4. Replace Google Search Element rendering with the combined browser-side result list.
5. Update source/localization controls and status messages for indexed, unsupported, empty, and failed states.
6. Replace fixture-only Google tests with local-index browser tests and add live ingestion smoke tests.
7. Update project docs, templates, verification config, and decision history.
8. Run full verification and review desktop/mobile behavior and final changes.

## Verification

- `python3 scripts/verify.py`
- Live index-generation smoke verification for Python `list`, Rust `Iterator`, JavaScript `Proxy`, and Python EN/JA.
- Browser tests must verify single-language results, both languages in a multi-language result set, non-official source inclusion, localization, original URLs, and `target="_blank"` behavior.
- Generated coverage metadata must distinguish supported and unsupported catalog sources and reject unexpected record-count drops.

## Open Issues

- The complete 49-domain catalog needs source-by-source adapter work after the vertical slice establishes index size and quality.
- Documentation licenses and robots directives must be reviewed before storing more than titles, headings, short excerpts, and original URLs.
