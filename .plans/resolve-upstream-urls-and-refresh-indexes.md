# Plan

## Goal

Keep generated search results on live upstream documentation pages and refresh
the committed indexes that have drifted since their previous retrieval.

## Scope

- Exclude Kotlin's production-inaccessible test fixture from its docs sitemap.
- Canonicalize Groovy's removed type-checking extension page to its merged
  section.
- Replace D's broken legacy backend module links with the current official
  library-index entries.
- Refresh Groovy, D, the nine initially drifted source-locale indexes, and the
  Python PEP index that drifted after the initial audit.
- Audit record, size, and URL changes before accepting regenerated artifacts.
- Update tests, source documentation, the decision history, and the local issue
  drafts.

## Non-goals

- Crawling arbitrary documentation pages to discover redirects.
- Repairing the upstream Kotlin, Groovy, or D websites.
- Changing the already-generated Rust or Perl artifacts.
- Automating periodic update pull requests.

## Assumptions

- Kotlin's `/docs/sitemap.xml` can continue exposing its internal test fixture
  even though the site-wide sitemap omits it.
- Groovy 5.0.7 keeps the removed page's content under
  `core-semantics.html#_type_checking_extensions`.
- D's official `/library/index.html` is the canonical source for all 88
  `dmd.backend` module routes that are broken in the legacy Phobos index.

## Steps

1. Record the source-specific URL policy and correct the Kotlin sitemap finding
   in the local issue draft.
2. Add Kotlin exclusion, Groovy URL canonicalization, and D backend replacement
   logic at their source-job boundaries.
3. Add source-job tests and known queries that exercise the repaired URLs.
4. Regenerate all indexes as required by the catalog-change atomicity guard,
   while confirming that only the repaired sources and drifted artifacts
   change.
5. Review record counts, sizes, representative additions and removals, and all
   repaired D backend URLs.
6. Run targeted tests, live URL checks, the complete live suite, and repository
   verification.
7. Update the issue drafts with measured results and completion status.

## Verification

- Targeted Vitest files for the English group A and remaining group D jobs.
- Live checks for `kotlin-docs/en`, `groovy-docs/en`, and `d-docs/en`.
- HTTP checks for all generated D backend library URLs.
- `npm run check:search-index`
- `npm run test:live`
- `python3 scripts/verify.py`
- `git diff --check`

## Open Issues

- Upstream sites can change again after the recorded verification date.
- The existing branch contains approved, uncommitted Rust, Perl, and search UI
  work that must remain intact.
- A 2026-07-30 full check found one additional content drift in
  `python-peps/en`; Rust and Perl remained unchanged.
