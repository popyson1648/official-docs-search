# Decision

## Title

Canonicalize known broken upstream document URLs at source-job boundaries

## Date

2026-07-30

## Status

Accepted

## Decision

Each affected source job applies the narrowest correction supported by its
official upstream data.

The Kotlin job excludes the production-inaccessible
`https://kotlinlang.org/docs/test-page.html` fixture even while the docs
sitemap continues to publish it.

The Groovy job rewrites only the removed
`type-checking-extensions.html` page to
`core-semantics.html#_type_checking_extensions`.

The D job removes the 88 broken `dmd_backend_*` entries from the legacy Phobos
index and replaces them with the 88 current `dmd/backend/` entries published by
the official library index.

## Context

Generated result URLs previously mirrored upstream indexes without checking
whether the target pages remained published.

Kotlin's site-wide sitemap omits its test fixture, but the docs-specific
sitemap used by the generator still includes it and the production URL returns
404.

Groovy merged the type-checking extension document into the core semantics
page but retained a stale internal link to the removed standalone page.

D's Phobos index still publishes flat `dmd_backend_*` links that return 404.
The official library index publishes the same 88 backend modules under their
current hierarchical routes.

## Alternatives

- Keep mirroring upstream indexes without correction.
  Rejected because the application would knowingly publish dead result links.
- Probe every result URL and drop every 404 during generation.
  Rejected because it adds hundreds of network requests, drops moved content,
  and makes generation less deterministic.
- Derive D's hierarchical paths from the flattened legacy names.
  Rejected because underscores do not preserve module-boundary information and
  the official library index already contains the exact routes.
- Maintain one global redirect table.
  Rejected because these failures have different causes and lifecycle rules.

## Reason

Source-specific corrections preserve valid searchable content without guessing
URL structure or adding broad network crawling.
They also remain testable with small fixtures that model each upstream defect.

## Consequences

- Kotlin's test fixture remains excluded until the docs sitemap stops
  publishing it and the production page becomes intentional.
- Groovy's exact redirect must be revisited when the configured Groovy version
  changes.
- D index generation reads one additional official input and records it in the
  manifest.
- The D catalog allows the official `/library/` path in addition to `/spec/`
  and `/phobos/`.
- Known live queries must exercise the Groovy and D corrections.
- Live verification prefers an exact normalized known-query title before its
  token-match fallback, so a more generic earlier record cannot hide the
  corrected URL.

## Revisit Conditions

- Kotlin removes the fixture from `/docs/sitemap.xml` or publishes it as a
  supported document.
- Groovy restores the standalone page or changes the merged section anchor.
- D fixes the legacy Phobos links or retires the official library index.
