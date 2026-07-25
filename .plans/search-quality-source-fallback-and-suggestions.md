# Plan

## Goal

Make documentation search reliably return useful results for common symbols
such as `cpp sort`, automatically use reviewed non-official references when a
language has no browsable official reference, and improve search tolerance,
suggestions, speed, accessibility, and empty-state consistency. Expand search
beyond reference manuals to official standards, proposal archives, and language
evolution records without presenting drafts or rejected proposals as current
language behavior.

## Scope

- Fix the incomplete C and C++ cppreference indexes by replacing the shallow
  top-page link extraction with a reviewed structured metadata source.
- Add cpprefjp as a Japanese C++ community reference, using its published
  sitemap and CC BY terms, and cover `std::sort` with a regression query.
- Add the official WG21 paper archive as a C++ standards-and-proposals source.
  Index paper identifiers, revisions, titles, authors, dates, and direct
  original HTML or PDF URLs from bounded official index pages; do not extract
  or republish paper bodies.
- Audit every catalog language for an official, publicly browsable
  specification, enhancement-proposal, RFC, or language-evolution archive.
  The first-pass candidate set includes C WG14 documents, Python PEPs,
  ECMAScript and TC39 proposals, Java JEPs, C# language proposals, Go
  proposals, Rust RFCs, Swift Evolution, Kotlin KEEP, Scala SIPs, PHP RFCs,
  Dart language proposals, WebAssembly proposals, WHATWG/W3C specifications,
  and CSSWG drafts. Add sources that have an authoritative steward, stable
  public metadata or index, safe direct URLs, and reviewable reuse terms.
- Audit the existing 44-language catalog for similarly established
  conventional or community references. Admit only candidates that pass the
  repository's existing stewardship, currency, stable-input, robots/terms,
  license, attribution, and visible-qualification gates; record both admitted
  and deferred candidates.
- Add a persisted setting named in the UI as “Include non-official references
  when no official web reference is available”. Default it to on.
- Apply that setting per requested language so a mixed-language query does not
  unnecessarily enable non-official sources for languages that already have an
  official source. Explicit `source:official` and a disabled setting remain
  authoritative.
- Show a bilingual notice when automatic fallback is applied, explaining that
  no official reference is available and linking or pointing to the setting.
- Enable typo-tolerant fuzzy matching by default, while preserving exact,
  prefix, phrase, and official-source ranking priority.
- Add accessible search suggestions derived from indexed titles, known-good
  queries, language aliases, and source metadata. Do not collect or upload user
  search history.
- Improve local search latency by caching normalized searchable fields in the
  worker, narrowing fuzzy candidates before edit-distance scoring, bounding
  candidate expansion, reusing loaded bundles, debouncing suggestion work, and
  discarding stale responses.
- Add document-kind metadata so results and source controls distinguish
  references, standards/specifications, proposals/RFCs, and design records
  independently from source authority (`official`, `conventional`, or
  `community`).
- Preserve proposal identifiers and available lifecycle state, such as draft,
  stage, accepted, implemented, final, rejected, withdrawn, or superseded.
  Render this state visibly and add a bilingual warning when a result does not
  describe adopted/current behavior.
- Rank reference and current normative specification results above proposal
  archives for broad API queries. Strong exact matches on a paper identifier
  such as `P2300`, `PEP 703`, `JEP 444`, or a proposal title may rank proposal
  results first.
- Make standards/proposal sources selectable and filterable without allowing
  their volume to crowd out ordinary reference results.
- Replace the separate no-source rendering branch with the same result-status
  component used for no results, while retaining contextual guidance when all
  sources are explicitly unavailable or deselected.
- Make live index verification change-aware. Keep deterministic validation on
  every CI run, but fetch only source adapters affected by the diff. Treat
  shared generator, HTTP, catalog, and schema changes as affecting every
  source, including GNU.
- Separate scheduled non-GNU refreshes from GNU/GCC refreshes. Keep the former
  weekly and run the latter monthly, matching the catalog update frequency and
  avoiding the mandatory 60-second GCC crawl delay on unrelated updates.
- Update source, indexing, settings, search, performance, accessibility, and
  contributor documentation together with catalog and generated artifacts.

## Non-goals

- General web crawling, copying documentation bodies, or indexing unreviewed
  search endpoints.
- Parsing full PDF bodies or treating committee papers, meeting notes, issue
  threads, and unaccepted proposals as normative specifications.
- Semantic or embedding search, an external hosted search service, accounts,
  or cross-device search-history synchronization.
- Automatically admitting one non-official source per language merely to meet
  a quota.
- Reclassifying community or conventional sources as official.
- Skipping GNU verification when shared indexing or transport code can affect
  GNU-generated artifacts.
- Merging the completed branch without explicit user approval.

## Assumptions

- “Official reference is unavailable” means the selected catalog language has
  no browsable source classified as `official`; it does not mean that an
  official source was manually deselected or temporarily failed to load.
- An explicit query flag has higher priority than the persisted automatic
  fallback setting.
- cppreference remains non-official. Its DevDocs metadata may be used as a
  bounded acquisition intermediary while result URLs continue to point to
  cppreference and cppreference's license and attribution remain controlling.
- cpprefjp remains a distinct Japanese community source and its result URLs
  point directly to `cpprefjp.github.io`.
- Standards bodies, language design teams, and their designated proposal
  repositories count as official sources for standards/proposal material even
  when the language has no freely browsable final ISO standard.
- A proposal's source authority and its adoption state are separate facts. An
  official proposal source does not imply that every indexed proposal is
  accepted, implemented, or normative.
- Only public indexes and metadata are stored for standards and proposal
  archives. Final standards that are paywalled or whose terms do not permit the
  required metadata extraction remain linked only where a reviewed public
  landing page supports it.
- Typo tolerance uses conservative length thresholds and exact-first ranking.
  Code-like short tokens, punctuation-heavy identifiers, and numbers must not
  be broadened aggressively.
- Suggestions use list autocomplete with manual selection so arbitrary queries
  remain valid.

## Steps

1. Restore a green `dev` baseline by fixing the GitHub Actions Puppeteer
   sandbox launch failure, run the complete repository verification locally,
   push the focused repair, and confirm the replacement Actions run succeeds.
2. Add source-scoped live verification and a change classifier. Reuse committed
   artifacts for unaffected sources, run GNU adapters only for GNU-specific or
   shared indexing changes, and split scheduled refresh workflows into weekly
   non-GNU and monthly GNU runs.
3. Record the source-admission, standards/proposal classification,
   automatic-fallback, fuzzy-ranking, suggestion, and empty-state decisions
   under `.decisions/`, including researched alternatives and precedence
   rules.
4. Replace the C/C++ shallow cppreference adapters with structured metadata
   adapters, add completeness and safety gates, generate updated indexes, and
   add regression coverage proving `cpp sort` returns `std::sort`.
5. Add cpprefjp to the catalog and generator from its sitemap, restrict records
   to reviewed reference paths, attach attribution and qualification metadata,
   and verify Japanese `sort` results.
6. Research established non-official references for catalog languages, apply
   the accepted admission gate consistently, implement safe adapters for
   accepted sources, and document reasons for deferrals.
7. Research official standards, proposal, RFC, and language-evolution archives
   for every catalog language. Add bounded adapters for accepted sources,
   preserve identifiers and lifecycle metadata, document inaccessible or
   unsuitable archives, and add representative identifier/title queries.
8. Extend catalog, manifest, compact-record, ranking, source-picker, result,
   and filter models with document kind and proposal status. Migrate generated
   bundles deterministically and visibly distinguish non-normative records.
9. Model and persist the automatic non-official fallback setting, resolve it
   per language, preserve explicit query/toggle precedence, and render the
   bilingual automatic-fallback notice.
10. Refactor worker search data into cached normalized records and bounded
   token/candidate structures. Add exact, phrase, prefix, infix, and
   conservative Damerau-Levenshtein scoring with deterministic ranking and
   deduplication.
11. Add a worker-backed suggestion request and an accessible editable combobox:
   debounce input, respect IME composition, discard stale responses, support
   Arrow keys, Enter, Escape, pointer selection, and keep arbitrary input
   valid.
12. Unify no-source and no-result presentation through one result-status
   component and provide contextual recovery actions without visually
   divergent empty states.
13. Add focused unit, integration, E2E, accessibility-interaction, index
   completeness, and performance regression tests. Update templates, current
   project documentation, verification metadata if needed, and generated
   search artifacts.
14. Run the repository verification command, source-scoped live-index checks,
    the scheduled full-refresh paths, a production
    browser smoke test for representative exact/fuzzy/suggestion/fallback
    queries, and final correctness, security, maintainability, and performance
    review.

## Verification

- `python3 scripts/verify.py`
- `npm run test:live`
- An unrelated UI or E2E-only diff makes no request to `gcc.gnu.org`.
- A GNU adapter/catalog change runs the corresponding GNU live checks, while a
  shared generator, schema, or HTTP change runs all affected GNU checks.
- Weekly non-GNU and monthly GNU scheduled refreshes both reproduce the
  committed manifest and bundles without hiding drift in unaffected sources.
- Browser checks at desktop and 390-by-800 mobile sizes, including:
  - `cpp sort` with default settings returns cppreference `std::sort`.
  - Japanese C++ `sort` includes cpprefjp.
  - a WG21 identifier query returns the exact paper and a broad `cpp sort`
    query keeps reference entries ahead of loosely related committee papers.
  - representative PEP, TC39 proposal, JEP, Rust RFC, Swift Evolution, KEEP,
    SIP, and PHP RFC identifiers resolve to authoritative direct URLs with
    visible status.
  - draft, rejected, withdrawn, and superseded records are never visually
    presented as current normative behavior.
  - a typo such as `cpp srot` offers or returns `std::sort`, ranked below an
    exact `sort` match.
  - C, C++, Common Lisp, HTML, and CSS automatically enable only their reviewed
    non-official sources by default and show the settings notice.
  - disabling the fallback or using `source:official` is respected.
  - mixed official/non-official-language queries apply fallback per language.
  - suggestion mouse, keyboard, Escape, Enter, focus, and IME behavior works.
  - source selection and zero-result states share one visual component.
- Compare cold and warm worker timings and bundle sizes to updated documented
  budgets; fail tests on material regressions.

## Open Issues

- The source audit may identify useful sites whose robots rules, terms,
  licensing, maintenance state, or structured inputs are insufficient. Those
  sources will be documented as deferred rather than indexed.
- Some languages use issue trackers or pull requests instead of a stable
  numbered proposal archive. Index only committee- or maintainer-recognized
  records with enough lifecycle metadata to avoid presenting arbitrary feature
  requests as language proposals.
- Official ISO/IEC standards are often paywalled even when committee drafts and
  paper logs are public. Never imply that a public working draft is the final
  published standard, and do not mirror restricted standard text.
- If full fuzzy matching across the largest selected bundle cannot meet the
  performance budget with bounded in-house indexes, evaluate a small
  precomputed lexical index format before adding a runtime dependency.
- cppreference's DevDocs metadata is more complete than the current adapter but
  can lag the rolling website. The implementation must expose the upstream
  timestamp and retain change gates so completeness does not imply freshness.
