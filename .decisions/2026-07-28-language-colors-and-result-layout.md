# Decision

## Title

Use GitHub Linguist colors and one result-title/source-link structure

## Date

2026-07-28

## Status

Accepted

## Decision

Every catalog language has a pinned `#RRGGBB` color in a separate static map,
taken from GitHub Linguist's `languages.yml`.
Bash uses Linguist's Shell color, and Visual Basic uses its Visual Basic .NET
color.
The exact color fills the result language tag and its border without a separate
marker.
The tag text is black or white, whichever produces the higher WCAG contrast
ratio against that color.

Every result uses the same structure: a non-link title followed by its language
tag, then one or more original-document links.
The structure does not change when a result has only one origin.

Result ordering defaults to relevance and may be changed to catalog language
name ascending or descending.
The original relevance order remains the tie-breaker within a language.
The floating Language, Site, and Order choice panel uses a fully pill-shaped
container like the filter/sort panel in `popyson1648/popyson-io`.
Search inputs and suggestion surfaces remain rounded rectangles.

## Context

Single-origin results previously linked the title and placed source metadata
above it, while grouped results used a plain title and subordinate source
links.
That made identical information change position and interaction depending on
the number of origins.
Neutral language tags also made mixed-language results slower to scan, while a
separate colored dot made the tag color less direct than a solid label.

GitHub uses Linguist for repository language recognition and statistics, and
Linguist publishes one CSS display color per language.
This provides one maintained, familiar palette across all 44 catalog
languages.
The palette remains outside `docs-sources.toml` because it does not affect
search-index generation and must not invalidate its integrity hash.

## Alternatives

- Choose colors separately from each language's current logo or brand guide.
  This has no uniform authority, and several languages have multiple or
  changing brand colors.
- Use a generated hue from the language id.
  This is complete but unfamiliar to engineers and has no semantic connection
  to the language.
- Use the Linguist color only as a dot or tint.
  This keeps the tag quiet but makes the recognized language color less
  immediate.
- Keep single-origin titles as links.
  This retains fewer elements but preserves the inconsistent layout.
- Replace relevance with language order by default.
  This makes browsing predictable but weakens the search engine's primary
  ranking signal.

## Reason

The Linguist palette is complete, familiar from GitHub, deterministic when
pinned, and does not require runtime network access.
Using the exact color as the background preserves the familiar palette.
Selecting the higher-contrast black or white foreground keeps every current
palette entry at or above a 4.5:1 contrast ratio.
One title/source-link structure gives every result the same visual hierarchy
and target behavior.
Keeping relevance as the default avoids changing expected search quality while
still providing explicit language ordering.

## Consequences

- New catalog languages must have one matching valid Linguist-aligned entry in
  the static palette.
- A deliberate Linguist palette refresh changes UI data and requires visual
  review in every supported site theme.
- Every palette entry must keep at least 4.5:1 contrast with its derived black
  or white tag text.
- Filter choice panels use the pill shape; text-search surfaces retain a
  rounded-rectangle shape.
- The result title is never an outbound link; the source row below is the
  link target even when only one source exists.
- Language sorting changes only the rendered group order and does not refetch
  search indexes.
- Tests enforce catalog color completeness, stable ordering, uniform result
  markup, safe source links, and responsive rendering.

## Revisit Conditions

- GitHub Linguist stops maintaining display colors or changes their meaning.
- The application adds user-defined languages not represented by Linguist.
- Accessibility testing shows that the accent treatment is insufficient in a
  supported theme or contrast mode.
- Result links gain additional actions that require a different title/source
  information architecture.
