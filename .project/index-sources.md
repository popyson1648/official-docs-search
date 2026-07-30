# Index Sources

## Collection Policy

Store only titles or headings, optional section labels, and original HTTPS URLs.
Do not store or republish documentation bodies.
`public/search-index/manifest.json` is the exact source-and-locale inventory and
records each input URL and hash, HTTP validators, retrieval time, output hash,
version, attribution, license URL, cadence, known queries, record count, and
compressed size.
`public/search-index/runtime-manifest.json` is a deterministic client-only
projection of that complete manifest. It keeps only source identity, ranking
and display metadata, locale/support state, bundle path/count, and visible
qualifications. The generator publishes both manifests together; maintenance,
live verification, provenance, and license review continue to use the complete
manifest.
A separate static map pins the current GitHub Linguist display color for every
catalog language without changing the search-index catalog hash.
Result tags, Language filter choices, and query-chip language labels use the
exact color as their background and select black at a perceived sRGB brightness
of 150 or above, otherwise white.
Generic controls and remove targets do not use language colors.

Fetch only reviewed public static indexes, tables of contents, sitemaps, and
structured metadata.
When an otherwise stable navigation page embeds per-request nonces or shuffled
feature flags, hash and parse a named canonical projection containing only the
reviewed navigation links.
The manifest records that canonicalizer; web.dev course pages use
`webdev-course-links-v1`.
Use the project user agent
`langref-search-indexer/0.4 (+https://langrefsearch.com/)`, which names
the service and a contact URL, plus bounded concurrency, a 30-second timeout with
bounded retry, and no discovery crawling or upstream search endpoints.
GNU GCC requests are serialized with the published 60-second crawl delay.
Robots rules and site terms were reviewed through 2026-07-27 and must be rechecked
before an endpoint moves or its collection method changes.
DevDocs is an acquisition intermediary, not a replacement for the underlying
documentation license.

## Result Title Policy

Preserve an upstream canonical qualified identifier when available.
When structured metadata or a reviewed stable URL proves the owner, qualify
API-like titles with their namespace, package, module, class, or type.
cpprefjp, Ruby, ExDoc, and Javadoc have explicit source-family rules.
For duplicate prose headings, append a section or concise URL-parent context
only when it distinguishes records.
Do not invent an API namespace from an ambiguous heading, and do not rewrite
standard or proposal identifiers.

## Supported Input Families

The manifest contains 90 supported source-locale indexes covering all 44
catalog languages.
The table groups inputs by collection method; the manifest remains canonical
for per-index versions, licenses, and attribution.

| Family | Supported indexes | Collection rule |
| --- | --- | --- |
| DevDocs metadata | Python, Rust, MDN JavaScript EN, TypeScript, Go standard library, Bash, and Perl | Fetch the maintained metadata per source and link to the reviewed upstream documentation. DevDocs lowercases every index path, so sources on case-sensitive upstreams restore the original case from the entry name before building a URL; Rust and Perl do. Bash also reads DevDocs' page map to link each record to its exact anchor in the Bash maintainer's current 5.3 manual copy. |
| Native generated indexes | Python JA and GHC/Solidity Sphinx, Java EN/JA Javadoc, Julia Documenter, Swift DocC, Dart API, Elixir ExDoc, and ECMA-262 | Parse only the public static search or navigation artifact. |
| Official standards and proposals | WG21 paper tables, Python PEP JSON, OpenJDK JEP index, and TC39 proposal tables | Store identifiers, titles, direct official URLs, and available lifecycle metadata only. Label these records as proposals and never imply that a draft, rejected, withdrawn, or superseded record is adopted behavior. |
| MediaWiki page metadata | cppreference C/C++ EN/JA | Enumerate the reviewed `c` or `cpp` namespace through the public API and use display titles with direct original page URLs; do not fetch page bodies. |
| Localized first-party TOCs | Microsoft Learn C#/PowerShell/F#/Visual Basic EN/JA, PHP EN/JA, Ruby EN/JA, MySQL EN/JA, and MDN JavaScript/WebAssembly/HTML/CSS EN/JA | Preserve the actual locale and localized title; never relabel an English URL as Japanese. |
| Official structured pages | Go guides, Kotlin, Dart guides, Erlang, Lua, R, Clojure, Groovy, GNU Objective-C, GNU Fortran, Fortran Lang, Zig, Nim, D, OCaml, Elm, Racket, Haxe, and SQLite | Fetch only the declared sitemap, top-level TOC, package list, or manual index. |
| Trusted teaching metadata | Comprehensive Rust, The Modern JavaScript Tutorial, TypeScript Deep Dive, Go by Example, C++ Core Guidelines, PHP: The Right Way, Elixir School, Learn You a Haskell, Advanced R, Clojure Guides, F# for Fun and Profit, zig.guide, Programming in D, Cornell OCaml, Solidity by Example, Common Lisp Cookbook, and web.dev Learn HTML/CSS | Require `source:all`; index only reviewed titles/headings and original links; show bilingual scope, version, freshness, or license qualifications wherever needed. |
| Other conventional/community metadata | cpprefjp JA, cppreference C/C++ EN/JA, Scala JA, Solidity JA, Elm packages, and the Common Lisp Technical Reference | Retain source kind and edition qualifications in the catalog and manifest. cpprefjp uses only its published `/lang/` and `/reference/` sitemap entries. |

WG21 archive pages do not grant one archive-wide content license; each paper
and its authors retain their own copyright and reuse terms.
The official `tc39/proposals` tracker declares no explicit reuse license, so
its adapter stores metadata only, points externally designated proposals back
to their exact official tracker row, and shows that limitation bilingually.
PEP metadata preserves code punctuation, and JBS-backed OpenJDK drafts are
labeled as drafts rather than assigned JEP numbers.

Scala EN is official.
Scala JA and Solidity JA are separate community source IDs, and Elm Packages is
conventional; they do not receive an `Official` label or ranking boost.
C, C++, Common Lisp, HTML, and CSS have no supported browsable official
reference index.
Their reviewed community or conventional references are enabled automatically
by default without an automatic-fallback notice.
The persisted setting can disable this behavior, while `source:official` and
`source:all` remain explicit overrides.
WG21 is official proposal material, not a replacement for a current C++
reference.

## Japanese Coverage And Qualifications

Eighteen maintained Japanese bundles are supported:
Python, JavaScript, C, C++, C#, Java, PHP, Ruby, Scala, PowerShell, F#, Visual
Basic, Solidity, SQL through MySQL, WebAssembly, HTML, CSS, and cpprefjp.
Japanese requests for every other language visibly fall back to English and
results remain labeled `EN`.

- cppreference C/C++ and Scala JA are partial editions.
- cpprefjp is a separate Japanese community reference published under CC BY
  4.0 and is not labeled official.
- Solidity JA is a community translation hosted with the project.
- MySQL JA is the official machine-translated 8.0 edition and trails the
  English 8.4 edition.
- MySQL TOCs come from Oracle's stable static documentation archive while
  results link to the equivalent original `dev.mysql.com` pages.
- TypeScript exposes a Japanese interface but its documentation content links
  to English, so it uses English fallback.
- Fortran Lang exposes only four Japanese-titled entries, Crystal JA is stale,
  and the D Tour lesson repositories do not provide an independent
  redistribution license; none is represented as a Japanese bundle.
These qualifications are copied into the manifest and rendered in result
metadata, rather than existing only in maintenance documentation.

## Trusted Non-official Source Qualifications

The 18 admitted English teaching sources and the separately admitted Japanese
cpprefjp reference have an identified author or steward,
useful current coverage, a stable reviewed index input, and reviewable reuse or
site terms.
They never receive an official ranking boost.
Their English and Japanese qualifications appear in both the source picker and
matching result metadata.

- TypeScript Deep Dive is a classic guide whose older chapters may not cover
  recent TypeScript behavior.
- zig.guide is pinned to Zig 0.15.2; its adapter validates the current-version
  badge before accepting rolling routes.
- Solidity by Example is example-oriented and does not replace current
  production security guidance.
- F# for Fun and Profit, C++ Core Guidelines, and the Cornell OCaml textbook
  are metadata-only indexes because their reuse terms require a narrow
  treatment.
- F# for Fun and Profit titles and links come from its public RSS feed; article
  descriptions are neither parsed nor stored.
- Course, cookbook, example, advanced, style, and guideline sources state their
  scope explicitly and do not replace language specifications or API
  references.

Beej's Guide to C, Ruby Style Guide, Erlang in Anger, PowerShell Practice and
Style, Beautiful Racket, and Use The Index, Luke! remain deferred because of
beta/preview status, slower maintenance, or intentionally narrow scope.

Scala's site links to the Apache-2.0 Scala software license, but the
`scala/docs.scala-lang` repository declares no separate documentation reuse
license.
The index therefore stores titles and direct links only and states that
limitation in attribution instead of claiming Apache-2.0 for the documentation.

## Robots And Terms Review

The 2026-07-23 review produced these acquisition boundaries:

| Input class | Hosts | Outcome |
| --- | --- | --- |
| Aggregated static metadata | `documents.devdocs.io` | One or a bounded set of static metadata files per source; underlying documentation licenses and attribution remain controlling. |
| Native search metadata | `api.dart.dev`, `developer.mozilla.org`, `docs.julialang.org`, `docs.oracle.com`, `docs.python.org`, `docs.swift.org`, `downloads.haskell.org`, `learn.microsoft.com` | Declared public search/index artifacts only; no search endpoint or page crawl. |
| Sitemaps and structured catalogs | `clojure.org`, `clojure-doc.org`, `crystal-lang.org`, `dart.dev`, `elixirschool.com`, `fortran-lang.org`, `fsharpforfunandprofit.com`, `javascript.info`, `kotlinlang.org`, `learnyouahaskell.github.io`, `lisp-docs.github.io`, `ocaml.org`, `package.elm-lang.org`, `web.dev`, `zig.guide` | Reviewed sitemap/catalog path only; excluded disallowed or off-scope paths. |
| Static TOCs and manual indexes | `adv-r.hadley.nz`, `basarat.gitbook.io`, `cran.r-project.org`, `cs3110.github.io`, `ddili.org`, `dlang.org`, `docs.groovy-lang.org`, `docs.racket-lang.org`, `docs.ruby-lang.org`, `docs.scala-lang.org`, `docs.soliditylang.org`, `en.cppreference.com`, `go.dev`, `gobyexample.com`, `google.github.io`, `guide.elm-lang.org`, `haxe.org`, `hexdocs.pm`, `isocpp.github.io`, `ja.cppreference.com`, `lispcookbook.github.io`, `nim-lang.org`, `phptherightway.com`, `raw.githubusercontent.com`, `solidity-by-example.org`, `tc39.es`, `www.erlang.org`, `www.lua.org`, `www.php.net`, `www.sqlite.org`, `ziglang.org` | One or a bounded declared set of public pages or primary-repository navigation files; no discovery crawl. Dynamic links must remain on their reviewed origin/version prefix. D keeps general library links on the legacy Phobos index but replaces its broken `dmd_backend_*` entries with the exact `dmd/backend/` routes in the official library index. |
| Standards and proposal indexes | `www.open-std.org`, `peps.python.org`, `openjdk.org`, `raw.githubusercontent.com/tc39` | Official year tables, JSON metadata, index pages, or repository-maintained proposal tables only; no paper bodies, issue searches, or arbitrary pull requests. Preserve code punctuation and raw lifecycle state, and record source-specific copyright or missing-license limitations. |
| Community sitemap | `cpprefjp.github.io` | Published sitemap restricted to `/lang/` and `/reference/`; direct Japanese result URLs and CC BY 4.0 attribution. |
| GNU manuals | `gcc.gnu.org` | Allowed manual inputs, serialized with the published 60-second crawl delay. |
| Excluded by terms | `developer.apple.com`, `www.lispworks.com` | Apple automated extraction/redistribution is blocked; HyperSpec partial/derived redistribution is disabled. Reviewed replacements remain separate sources. |

Source jobs may apply a reviewed correction when an official index publishes a
known dead route. The Kotlin job excludes its production-inaccessible
`test-page.html` fixture, while the Groovy job maps the removed standalone type
checking extension page to its merged core-semantics section. Each correction
is exact and covered by a source-job test; arbitrary URL guessing is not
allowed.

The exact URLs and retrieval hashes are in the manifest.
Recheck the named host's current robots file and terms before changing any
endpoint, path, frequency, or collection method.

## Replaced Blocked Sources

Apple Objective-C remains `blocked`: undocumented DocC JSON is excluded because
Apple's Website Terms prohibit automated extraction and redistribution.
The supported official replacement is GNU Objective-C Features.

The LispWorks Common Lisp HyperSpec remains `disabled`: its terms permit only a
complete, unmodified copy and prohibit the partial or derived symbol metadata
needed here.
The supported community replacement is the MIT-licensed Common Lisp Technical
Reference based on public-domain dpANS3R sources.

Any input, version, license, attribution, cadence, qualification, or robots
change must update the job metadata, this policy and template, and generated
manifest in one reviewed change.

## Deferred Standards And Evolution Sources

WG14 documents, C# proposals, Go proposals, Rust RFCs, Swift Evolution, Kotlin
KEEP, Scala SIPs, PHP RFCs, Dart proposals, WebAssembly proposals,
WHATWG/W3C specifications, and CSSWG drafts were reviewed as candidates.
They are not admitted in this tranche because at least one of lifecycle-state
normalization, bounded metadata acquisition, stable direct-result scope, or
reuse-term review remains incomplete.
An issue label or open pull request alone is not enough to classify a record as
an official language proposal.
