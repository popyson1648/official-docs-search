# Decision

## Title

Exact-first fuzzy search, document kinds, and per-language source fallback

## Date

2026-07-27

## Status

Accepted; automatic-fallback notice superseded by
`2026-07-27-silent-automatic-fallback.md`

## Decision

Acquire complete C and C++ page metadata from cppreference's public MediaWiki
API instead of extracting only the landing-page links.
Add cpprefjp from its published sitemap and add bounded official proposal
indexes for WG21 papers, Python PEPs, OpenJDK JEPs, and TC39 proposals.

Classify every source independently by authority and document kind.
`official`, `conventional`, and `community` describe authority;
`reference`, `specification`, `proposal`, and `design-record` describe content.
Proposal results retain available lifecycle state, receive a broad-query
ranking penalty, and show a warning that they may not describe adopted
behavior.

Enable conservative Damerau-Levenshtein matching after exact matching.
Only typo-expand alphanumeric tokens of at least four characters, use a
distance of one below eight characters and two thereafter, and retain
deterministic exact-first scoring.
Use the same page-lifetime worker, loaded bundles, normalized-record cache, and
bounded request cache for results and debounced title suggestions.

For C, C++, Common Lisp, HTML, and CSS, default the persisted
automatic-non-official setting to on.
Apply it independently per requested language and only to explicitly reviewed
catalog sources.
An explicit `source:official`, `source:all`, or disabled setting overrides the
automatic behavior.

Use one result-status element for both no-source and no-result states.
When no sources are selected, do not fetch the manifest.

## Context

`cpp sort` returned no result because the C++ adapter indexed only links found
on the top page.
The same shallow extraction pattern could silently omit common symbols in
other large references.
Users also reported few matches, no query suggestions, inconsistent empty
states, and the need for established language-design archives beyond reference
manuals.

The source audit found stable, bounded primary metadata for cppreference,
cpprefjp, WG21, PEP, JEP, and TC39.
It also reviewed WG14 documents, C# proposals, Go proposals, Rust RFCs, Swift
Evolution, Kotlin KEEP, Scala SIPs, PHP RFCs, Dart proposals, WebAssembly
proposals, WHATWG/W3C specifications, and CSSWG drafts.
Those candidates remain deferred until their lifecycle-state mapping,
collection boundary, result URL scope, and reuse terms can be accepted
together; issue trackers are not treated as proposal archives by default.

## Alternatives

- Keep shallow page extraction and add hand-maintained aliases for missing
  symbols.
- Use an external hosted search service or semantic vector search.
- Apply fuzzy matching to every token and every substring.
- Treat every official committee or proposal record as current normative
  documentation.
- Turn on every non-official source globally whenever one selected language
  lacks an official reference.

## Reason

Structured primary metadata fixes completeness without copying documentation
bodies or discovery-crawling.
Separate authority, document kind, and lifecycle state prevent an official
draft from being presented as adopted behavior.
Conservative lexical tolerance fixes ordinary transpositions such as `srot`
without broadly corrupting code-symbol searches.
One worker and bounded caches keep suggestions responsive without uploading
queries or adding a second search implementation.
Per-language fallback helps languages without a browsable official reference
without weakening official-only results for unrelated languages.

## Consequences

The catalog and manifest now carry document kinds, and compact proposal tuples
may carry lifecycle state.
Source adapters must provide bounded inputs, direct approved URLs, known
queries, count gates, attribution, and either reviewed license information or
an explicit visible statement that the metadata source declares no license.
Reference results generally rank above proposal records, except when the query
strongly matches a proposal identifier or title.
The automatic fallback is persisted locally and covered by source-resolution
and browser tests.
Search suggestions may load selected bundles before a submitted search, but
reuse immutable HTTP responses and the worker cache.

## Revisit Conditions

Revisit the fuzzy thresholds if measured false positives exceed useful typo
recoveries.
Evaluate a precomputed lexical candidate index if large mixed-language
suggestion requests exceed the browser latency budget.
Admit another standards or evolution archive when its official steward,
bounded metadata input, lifecycle mapping, URL scope, reuse terms, and
qualification text are all reviewed.
Reconsider IndexedDB only for an offline requirement or measured failure of
native HTTP and page-lifetime caching.
