# Plan

## Goal

Add TypeScript Deep Dive and a quality-gated set of similarly trusted
non-official learning and reference sources without weakening the default
official-only search experience.

The admission standard is not "one extra source for every language."
A source is eligible only when it is systematic rather than a loose blog
collection, has a clearly identified author or steward, remains useful today,
offers a stable static index or table of contents, and has reviewable reuse or
site terms.

## Scope

- Add 18 English `conventional` or `community` source indexes selected after
  reviewing all 44 catalog languages.
- Keep every new source behind the existing non-official source selection and
  `source:all`; official-only searches must remain unchanged.
- Store only titles or headings, optional section names, and direct HTTPS URLs.
  Do not copy article or book bodies.
- Add visible qualifications for sources that are version-specific, advanced,
  specialized, historically important but slowly updated, beta quality, or
  licensed for metadata-only indexing.
- Preserve the requested Japanese locale contract: use exact Japanese content
  only when a separately maintained translation is verified; otherwise return
  visibly English fallback results.
- Add source-specific minimum counts, known queries, URL scopes, attribution,
  licenses, update cadence, input hashes, and change gates.

## Candidate Set

### Approved set

| Language | Source | Kind | Index input | Qualification |
| --- | --- | --- | --- | --- |
| Rust | Comprehensive Rust | conventional | Repository `src/SUMMARY.md` | Google-maintained course, not an API reference |
| JavaScript | The Modern JavaScript Tutorial | conventional | Repository article tree | Index titles and links only; repository and site license labels differ |
| TypeScript | TypeScript Deep Dive | conventional | GitBook page sitemap plus repository `SUMMARY.md` | Classic guide; many chapters predate recent TypeScript features |
| Go | Go by Example | conventional | Static home-page TOC or repository examples | Example-oriented, not a language specification |
| C++ | C++ Core Guidelines | conventional | Repository Markdown headings | Rule names and links only under the source's custom license |
| PHP | PHP: The Right Way | community | Sitemap and single-page section anchors | Practical recommendations and curated links |
| Elixir | Elixir School | community | Locale-filtered sitemap | English first; translations have independent freshness |
| Haskell | Learn You a Haskell, community edition | community | Sitemap or chapter Markdown | Community-maintained edition; official GHC docs remain authoritative |
| R | Advanced R, second edition | conventional | Bookdown TOC | Advanced language internals, not an introductory R course |
| Clojure | Clojure Guides | community | Sitemap | Community guide; official reference keeps ranking priority |
| F# | F# for Fun and Profit | conventional | Sitemap / site contents | Titles and links only; site text is not openly relicensed |
| Zig | zig.guide | conventional | Sitemap | Pin and display the covered Zig version |
| D | Programming in D | conventional | Chapter TOC and keyword index | Community book under CC BY-NC-SA |
| OCaml | OCaml Programming: Correct + Efficient + Beautiful | conventional | Public Sphinx search index | Spring 2026 course; metadata only under CC BY-NC-ND |
| Solidity | Solidity by Example | community | Repository `src/search.json` | Example-oriented; official security guidance remains authoritative |
| Common Lisp | The Common Lisp Cookbook | community | Repository Markdown navigation | Practical cookbook, not the ANSI specification |
| HTML | web.dev Learn HTML | conventional | Filtered web.dev sitemap/course TOC | Practical course, not the WHATWG specification |
| CSS | web.dev Learn CSS | conventional | Filtered web.dev sitemap/course TOC | Practical course, complementary to MDN |

All 18 sources receive lower source-kind ranking than official sources.
Sources with restrictive or mismatched terms must demonstrate that generated
bundles retain only approved minimal metadata.

### Deferred after value review

- Beej's Guide to C Programming: the author still labels the guide beta.
- Ruby Style Guide: useful but limited to style rather than language coverage.
- Erlang in Anger: production debugging specialization and an older main text.
- PowerShell Practice and Style: preview status and slower recent maintenance.
- Beautiful Racket: valuable but narrowly focused on language-oriented design.
- Use The Index, Luke!: valuable but narrowly focused on SQL index performance.

## Rejected Candidates

Do not add a source merely to fill a language slot.
The current review found no candidate meeting all criteria for:

- Python, C#, Java, Swift, Kotlin, Scala, Dart
- Lua, Perl, Julia, Groovy, Objective-C, Bash, Visual Basic
- Nim, Crystal, Elm, Fortran, Haxe, WebAssembly

Reasons include prohibited automated extraction, missing content licenses,
stale language versions, archived or unreachable sites, insufficient breadth,
and failure to improve on an existing conventional source.
Record the evidence in the source review documentation so these decisions can
be revisited when a candidate changes.

## Non-goals

- Republishing book, tutorial, or article bodies.
- Treating popularity or star count alone as evidence of reliability.
- Presenting a community guide as official or allowing it to outrank official
  documentation by source kind.
- Adding paywalled, login-gated, search-endpoint, or discovery-crawled content.
- Creating fake Japanese bundles from English material.
- Adding framework-only resources that do not materially document the language.
- Merging or deploying automatically.

## Assumptions

- The existing `official`, `conventional`, and `community` source-kind model is
  sufficient.
- New sources are enabled only when the user includes non-official sources in
  the existing source controls.
- English-only additions use the existing truthful Japanese-to-English
  fallback behavior.
- Source qualifications remain part of the manifest and visible result
  metadata.
- A source that later becomes stale, changes terms, loses its static index, or
  redirects to unrelated content moves to `disabled` rather than silently
  remaining supported.

## Steps

1. Record a source-admission decision defining evidence requirements,
   classification, metadata-only indexing, visible qualifications, update
   freshness, and disable/review triggers.
2. Add the 18 catalog sources with exact domains, path prefixes, source kinds,
   English locale declarations, and supported status.
3. Extend reusable parsers for Markdown/AsciiDoc/TeX navigation, nested
   sitemaps, GitBook summaries, bookdown TOCs, and stable single-page anchors.
4. Implement the adapters in parallel source-family modules with malformed
   input fixtures, known queries, minimum counts, licenses, attribution, and
   change gates.
5. For metadata-only sources, prove that generated bundles contain only
   titles/headings, sections, and direct links and add the required
   specialization or freshness qualification.
6. Verify source filtering and ranking: official-only results remain
   byte-for-byte behaviorally unchanged, while `source:all` adds the relevant
   non-official results below official matches.
7. Generate all artifacts once after integration and review every new input
   hash, output hash, URL scope, record count, compressed size, attribution,
   license, qualification, and known-query result.
8. Add data-driven integration and browser tests covering all 18 new sources,
   source-kind labels, qualifications, Japanese-to-English fallback, safe
   links, partial bundle failure, and official-only exclusion.
9. Re-run selected-set compression and mobile worker performance budgets, then
   update the performance and transfer snapshot.
10. Update source-review, build, testing, structure, release, and template
    documentation together with the weekly update workflow.
11. Run the complete repository verification and perform independent final
    code and manifest reviews with sub-agents.

## Parallel Work

After approval:

- Agent A owns adapters for Rust, JavaScript, TypeScript, Go, C++, and PHP.
- Agent B owns adapters for Elixir, Haskell, R, Clojure, F#, and Zig.
- Agent C owns adapters for D, OCaml, Solidity, Common Lisp, HTML, and CSS.
- The primary agent owns the catalog, shared admission decision, generator
  integration, generated artifacts, cross-source tests, documentation,
  performance measurement, and final verification.

Agents must not edit the catalog or publish generated artifacts independently.

## Verification

- Focused parser tests for valid and malformed input from every adapter family
- Assert 18 new supported English source-locale entries and unchanged 44
  language / 17 Japanese coverage
- Assert every new source has a non-empty qualification where required
- Assert official-only search excludes all 18 additions
- Assert `source:all` returns a live known result for every addition
- Assert every generated result is HTTPS and within catalog domain/path scope
- Assert stored bundles contain only tuple metadata, never documentation bodies
- `npm run update:search-index`
- `npm run check:search-index`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:server`
- `npm run test:live`
- `npm audit --omit=dev`
- `git diff --check`
- `python3 scripts/verify.py`

## Approval

- Approved by the user on 2026-07-23 with visible caveats for any source whose
  age, scope, version, stewardship, or reuse terms need qualification.
