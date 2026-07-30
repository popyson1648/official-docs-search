# Decision

## Title

Restore upstream path case for DevDocs-derived result URLs

## Date

2026-07-29

## Status

Accepted

## Decision

Adapters that read a DevDocs index restore the upstream path case from the
DevDocs entry name before building a result URL. `normalizeDevdocsEntries`
accepts an optional `resolvePath(path, entry)` hook, `rust-docs` uses
`restoreRustdocPathCase`, and `normalizePerlDevdocs` prefers the entry name
whenever it differs from the path only by case.

Known queries for a source must name a record whose URL depends on the repaired
case, so live verification exercises the repair.

## Context

DevDocs lowercases every path in its published `index.json`. `doc.rust-lang.org`
and `perldoc.perl.org` serve case-sensitive routes, so 31,439 of 37,210
`rust-docs` records and 48 `perl-docs` records resolved to HTTP 404.

The defect survived live verification because `rust-docs` declared the known
queries `iterator` and `option`, which both match a lowercase Guide chapter
before they reach any API page.

A live audit of 2,874 result URLs across every catalog language confirmed the
two DevDocs sources were the only systematic failures. The remaining three
failures are broken links published upstream and are mirrored faithfully.

## Alternatives

- Rewrite result URLs in the browser. Rejected: the repair belongs to index
  generation, and the client must keep rendering stored URLs verbatim.
- Fetch each candidate page during generation to discover the real case.
  Rejected: tens of thousands of requests per refresh for data the index
  already carries.
- Hardcode a case map per source. Rejected: it goes stale on every upstream
  release.

## Reason

The DevDocs entry name preserves the upstream item case, so the correct URL is
derivable offline and deterministically. Rust module segments and
`method`/`tymethod` fragments are snake_case upstream, so only the final
`<kind>.<Item>` segment needs repair.

## Consequences

- `devdocsJob` accepts `resolvePath`; adapters for case-sensitive upstreams must
  set it.
- `rust-docs` known queries are `TcpListener` and `IntoIterator`.
- Adding a DevDocs-derived source requires checking whether the upstream site is
  case-sensitive before declaring `supported`.

## Revisit Conditions

- DevDocs starts publishing original-case paths.
- Rust adopts non-snake_case module names, or rustdoc adds fragment kinds whose
  targets are not snake_case.
