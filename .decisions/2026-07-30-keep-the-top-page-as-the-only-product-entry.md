# Decision

## Title

Keep the top page as the only product entry

## Date

2026-07-30

## Status

Accepted

## Decision

LangRef Search keeps its current top page as the only product entry.
Do not add language-, source-, proposal-, or query-specific landing pages for
search acquisition.
Localized EN and JA URLs are alternate representations of that same top page,
not separate content destinations.

## Context

SEO research identified dedicated landing pages as one possible way to match
more search intents.
The product instead prioritizes one direct search experience and a single,
recognizable entry point.

## Alternatives

- Publish original language-specific landing pages.
- Generate source- or proposal-specific landing pages from the catalog.
- Allow search and filter URL combinations to be indexed.

## Reason

A single entry preserves the intended experience and avoids thin, duplicated,
or competing pages.
Technical discovery signals can make the top page indexable without changing
the visible product structure.

## Consequences

- The top page carries localized metadata, canonical, and `hreflang` signals.
- Search and filter state URLs use `noindex,follow`.
- The sitemap lists only the root and its EN/JA representations.
- Additional explanatory pages and external-discovery work remain deferred.

## Revisit Conditions

Revisit only when the product owner explicitly approves more than one product
entry and each proposed page has distinct user value.
