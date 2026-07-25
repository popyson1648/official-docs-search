# Plan

## Goal

Complete searchable documentation coverage for the remaining catalog languages
and make every language behave truthfully under both the English and Japanese
Docs-locale selections.

The completion unit is a catalog language, not every secondary source:

- Every language must have at least one supported, maintained English index.
- A language with a maintained Japanese documentation edition must have at
  least one supported Japanese index.
- A language without a maintained Japanese edition must use an explicit English
  fallback when Japanese is requested, label results as English, and explain the
  fallback in the UI. It must never duplicate an English bundle and call it
  Japanese.
- A language may remain unavailable only when a stable, legally usable index
  cannot be obtained, and only after the exact evidence and exception are
  reviewed.

The current baseline is 44 languages, 55 sources, 66 source-locale declarations,
13 supported indexes, 9 languages with a supported index, and 35 languages with
no supported index.

## Implementation Outcome

Implemented on `feature/all-languages-locales`:

- 67 supported indexes now cover all 44 languages.
- 17 maintained Japanese indexes cover Python, JavaScript, C, C++, C#, Java,
  PHP, Ruby, Scala, PowerShell, F#, Visual Basic, Solidity, SQL through MySQL,
  WebAssembly, HTML, and CSS.
- Every other language uses the approved visible JA-to-EN fallback and keeps
  result locale labels truthful.
- GNU Objective-C Features and the MIT Common Lisp Technical Reference provide
  reviewed replacement coverage while the Apple and LispWorks inputs retain
  their explicit blocked/disabled states.
- TypeScript JA, Crystal JA, Fortran Lang JA, and D Tour JA were rejected after
  content freshness, localization depth, or redistribution review.
- Scala JA and Solidity JA use separate community source IDs; qualified partial
  or machine-translated editions are visibly labeled in search results.
- C, C++, Common Lisp, WebAssembly, HTML, and CSS require non-official sources
  to be enabled because they do not yet have a supported official index.

### Coverage Matrix

The implementation matrix starts with the following reviewed source classes.
`Exact JA` means a maintained Japanese edition is a candidate for its own
index. `EN fallback` means Japanese requests must remain usable through a
visibly English result.

| Language | Current supported locale | Japanese plan |
| --- | --- | --- |
| Python | EN, JA | Exact JA already supported |
| Rust | EN | EN fallback |
| JavaScript | EN | Exact JA through MDN |
| TypeScript | EN | Exact JA |
| Go | EN standard library | EN fallback; add English guides |
| C | None | Exact JA through community cppreference |
| C++ | None | Exact JA through community cppreference |
| C# | EN | Exact JA through Microsoft Learn |
| Java | EN | Exact JA through Oracle Javadoc |
| PHP | EN, JA | Exact JA already supported |
| Ruby | EN, JA | Exact JA already supported |
| Swift | None | EN fallback |
| Kotlin | None | EN fallback |
| Scala | None | Exact JA where the official edition is maintained |
| Dart | None | EN fallback |
| Elixir | None | EN fallback |
| Erlang | None | EN fallback |
| Haskell | None | EN fallback |
| Lua | None | EN fallback |
| Perl | None | EN fallback |
| R | None | EN fallback |
| Julia | None | EN fallback |
| Clojure | None | EN fallback |
| Groovy | None | EN fallback |
| Objective-C | Blocked | Reassess; otherwise evidence-backed exception |
| Bash | None | EN fallback |
| PowerShell | None | Exact JA through Microsoft Learn |
| F# | None | Exact JA through Microsoft Learn |
| Visual Basic | None | Exact JA through Microsoft Learn |
| Zig | None | EN fallback |
| Nim | None | EN fallback |
| Crystal | None | Qualified JA only if freshness passes review |
| D | None | Exact JA for the official Tour; EN fallback elsewhere |
| OCaml | None | EN fallback |
| Solidity | None | Qualified JA community translation on official host |
| Elm | None | EN fallback |
| Racket | None | EN fallback |
| Common Lisp | Disabled | Reassess; otherwise evidence-backed exception |
| Fortran | None | Qualified JA where translated pages are maintained |
| Haxe | None | EN fallback |
| SQL | None | Exact JA for maintained MySQL edition; EN elsewhere |
| WebAssembly | None | Exact JA through MDN; EN fallback for specification |
| HTML | None | Exact JA through MDN |
| CSS | None | Exact JA through MDN |

## Scope

- Build and maintain a complete `language × requested Docs locale` coverage
  matrix for all 44 catalog languages.
- Add supported English index adapters for the 35 currently unsearchable
  languages and close material gaps in already searchable languages.
- Add supported Japanese indexes for maintained Japanese editions, including
  currently planned MDN and Microsoft Learn sources and newly verified
  TypeScript, Java, Scala, Solidity, Crystal, Fortran, MySQL, D Tour, and
  cppreference candidates when their freshness and source classification pass
  review.
- Distinguish the requested locale from the actual content locale so an
  English-only language remains usable under a Japanese request without
  mislabeling its results.
- Preserve exact-locale preference, original documentation URLs, source-kind
  filtering, safe links, deterministic ranking, content-addressed bundles,
  manifest-last publication, and explicit planned/blocked/disabled states.
- Split the monolithic job registry into source-family modules and add reusable
  adapters for DevDocs, Sphinx, Javadoc, Microsoft Learn, MDN, and structured
  HTML/JSON indexes.
- Add bounded concurrency and source-level diagnostics to generation and live
  verification while preserving deterministic artifact order.
- Make runtime loading resilient to a single bundle failure and report partial
  failures instead of discarding successful results.
- Update generated indexes, tests, decisions, project documents, templates,
  local verification, and CI/update workflows together.

## Non-goals

- General Web crawling, hosted full-text search, or republishing documentation
  bodies.
- Machine-translating English documentation or presenting community
  translations as official.
- Treating an obsolete or partial Japanese edition as equivalent to a current
  English edition without a visible qualification.
- Requiring all 55 sources to become supported when one maintained source
  already satisfies a language and another source is intentionally blocked,
  disabled, redundant, or unsuitable.
- Changing the UI language and Docs-locale independence.
- Adding `/en/` and `/ja/` application routes; this plan treats “location” as
  the existing Docs-locale selection.
- Merging or deploying automatically.

## Assumptions

- `src/data/docs-sources.toml` remains the canonical declaration of actual site
  locales and per-locale index status.
- Requested-locale fallback is modeled separately from actual `site_locales`
  and bundle `docsLocale`; an English source is never declared as a Japanese
  site solely to provide fallback behavior.
- Official sources remain the default. Conventional or community Japanese
  sources are separate catalog sources and retain their source kind.
- Public static indexes, tables of contents, and maintained DevDocs metadata are
  preferred over page crawling or upstream search endpoints.
- Blocked or disabled inputs remain visible even when a reviewed replacement
  supplies language coverage.
- Existing query parameters and cookies (`ui`, `docsLocale`, `locale:`) remain
  compatible.
- Generated artifacts are produced once by the integrating agent after adapter
  work is combined. Parallel agents do not publish `public/search-index/`.

## Steps

1. Record the approved interpretation of English/Japanese coverage in a new
   decision. Define exact-locale preference, truthful English fallback for
   Japanese requests, result labeling, notices, and the exception process.
2. Build a reviewed matrix for all 44 languages. For each candidate source and
   actual locale, record the input endpoint, adapter family, current version,
   URL scope, license and attribution, robots/terms result, update cadence,
   known query, minimum record count, and whether the edition is complete,
   partial, stale, conventional, or community-maintained.
3. Refactor index jobs into source-family modules and strengthen the generator:
   reject duplicate source-locale jobs, support bounded fetch concurrency,
   retain deterministic manifest order, preserve atomic manifest-last
   publication, and provide focused source/locale generation for development.
4. Implement the requested-locale versus content-locale contract in the catalog
   projection, search runtime, worker protocol, result rendering, and localized
   notices. Prefer exact Japanese indexes; otherwise select the same language's
   supported English index and keep its result locale visibly `EN`.
5. Add the first parallel adapter wave using existing adapters and verified
   maintained DevDocs inputs for suitable English sources such as C, C++, Bash,
   Clojure, D, Dart, Elixir, Erlang, Fortran, Groovy, Haskell, Haxe, Julia,
   Kotlin, Lua, Nim, OCaml, Perl, PostgreSQL, PowerShell, R, Scala, SQLite, Zig,
   HTML, and CSS. Reject stale DevDocs versions rather than accepting them for
   coverage.
6. Add the second parallel wave for structured multilingual sources: Java
   Javadoc EN/JA, Solidity Sphinx EN/JA, MDN JavaScript/WebAssembly/HTML/CSS
   EN/JA, and Microsoft Learn C#/PowerShell/F#/Visual Basic EN/JA. Build a common
   method for real localized Microsoft titles instead of rewriting English URLs.
7. Add the third wave for source-specific English and Japanese indexes:
   TypeScript JA, Scala JA, Crystal JA, Fortran Lang JA, MySQL JA, D Tour JA,
   cppreference C/C++ JA, Swift, Dart API, Elixir guides, GHC, R manuals, Elm,
   Racket, and remaining SQL sources. Keep partial, stale, or community editions
   visibly classified.
8. Reassess Objective-C and Common Lisp using primary evidence. Add a supported
   replacement only if its index is stable and distributable; otherwise prepare
   the exact evidence-backed exception for user review.
9. Generate all artifacts once after integration. Review every catalog and
   manifest change, input and output hash, URL scope, record-count gate,
   compressed size, attribution, license, and known query before retaining the
   generated files.
10. Convert integration and browser coverage to data-driven matrices. Exercise
    every supported language, every supported Japanese index, English fallback,
    exact-locale preference, multi-language diversification, partial bundle
    failure, planned/blocked/disabled states, desktop, mobile, and safe links.
11. Replace the obsolete “all 13 bundles under 1 MB” gate with reviewed
    per-bundle and representative selected-set budgets while retaining warm
    mobile latency and Long Task limits. Record the budget decision and update
    the transfer-cost snapshot.
12. Update `.project/` and matching `.template/` files, the weekly index-update
    workflow, release instructions, and verification configuration where the
    commands or workflow change.
13. Run the full verification suite, inspect desktop and mobile behavior, review
    the final diff for correctness, regressions, maintainability, security, and
    performance, then report any approved exception separately.

After Steps 1–4 establish the shared contract, use sub-agents in parallel:

- Adapter group A changes only its job modules, shared-adapter fixtures, and
  focused tests.
- Adapter group B changes disjoint job modules and focused tests.
- Runtime/UI changes only `src/core/`, `src/client/`, the Astro page, and focused
  runtime/browser tests.
- The primary agent owns the catalog, job registry, manifest generation,
  `public/search-index/`, integration tests, decisions, documents, and final
  verification.

## Verification

- `npm run typecheck`
- `npm run test`
- Adapter fixture tests for every parser family and malformed upstream input.
- `npm run update:search-index`
- Review generated source/locale, record-count, size, hash, URL, attribution,
  license, and known-query differences.
- `npm run check:search-index`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:server`
- `npm run test:live`
- `npm audit --omit=dev`
- `git diff --check`
- `python3 scripts/verify.py`
- Compare `git status --porcelain` before and after check/live commands to prove
  they are non-destructive.
- Verify that identical inputs produce byte-identical artifacts and that a
  failed adapter leaves published artifacts unchanged.
- Verify every supported bundle uses HTTPS URLs within its catalog domain/path,
  has a non-empty known query, and resolves a live result successfully.
- Verify exact JA, EN, JA-to-EN fallback, UI-locale independence, source
  filtering, safe new-tab links, and visible partial-error behavior in desktop
  and mobile browsers.

## Open Issues

- None. The user approved the Docs-locale interpretation before implementation.
