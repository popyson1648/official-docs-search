# Decision

## Title

Use the interface language as the default documentation language

## Date

2026-07-28

## Status

Accepted

## Decision

Expose one EN/JA language control. Its value sets the interface language and
the preferred documentation locale. An explicit `locale:en` or `locale:ja`
query overrides only the documentation locale. When Japanese is preferred and
a selected source has no Japanese index, use that source's English index and
show the existing consolidated fallback notice.

Remove the independent Docs control and stop persisting a separate Docs-locale
preference. Treat an old `docsLocale` URL parameter as migration input, then
use the unified language in subsequent URLs.

Resolve initial language state in this order:

1. explicit `ui` URL value;
2. legacy `docsLocale` URL value;
3. `ods_ui` cookie;
4. legacy `ods_docs_locale` cookie;
5. English.

Delete the legacy cookie after reading it. If both URL values exist, `ui` wins.

## Context

The separate UI and Docs controls represented two valid preferences, but made
the primary search form harder to understand and constrained the mobile
layout. Most users expect a Japanese interface to prefer Japanese
documentation. Power users already have an explicit query-level locale
operator.

## Alternatives

- Keep both controls permanently visible.
- Remove all documentation-locale overrides.
- Search English and Japanese indexes together by default.

## Reason

One visible language choice matches the common path and reduces persistent
controls. Retaining `locale:` preserves the meaningful bilingual workflow
without forcing every user to understand two language settings. Per-source
fallback avoids duplicate results and remains truthful about unavailable
translations.

## Consequences

- EN/JA changes can trigger a search-index load as well as interface text.
- Language intent prefetching moves from the removed Docs control to the
  unified language control.
- The constrained cold-switch budget includes LINE Seed JP subsets triggered
  by newly visible Japanese interface text; the typeface is not removed or
  substituted to satisfy the budget.
- Shared legacy URLs remain understandable, but new URLs use one language
  preference unless the query contains `locale:`.
- Search help must continue to document the explicit locale operator.

## Revisit Conditions

Reconsider a separate control if usage data shows frequent UI/document
language divergence that `locale:` cannot serve accessibly.
