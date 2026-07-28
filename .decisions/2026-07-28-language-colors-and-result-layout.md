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
The color appears as a dot, border, and light tint in the result language tag;
normal theme text colors remain responsible for readable labels.

Every result uses the same structure: a non-link title followed by its language
tag, then one or more original-document links.
The structure does not change when a result has only one origin.

Result ordering defaults to relevance and may be changed to catalog language
name ascending or descending.
The original relevance order remains the tie-breaker within a language.

## Context

Single-origin results previously linked the title and placed source metadata
above it, while grouped results used a plain title and subordinate source
links.
That made identical information change position and interaction depending on
the number of origins.
Neutral language tags also made mixed-language results slower to scan.

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
- Keep single-origin titles as links.
  This retains fewer elements but preserves the inconsistent layout.
- Replace relevance with language order by default.
  This makes browsing predictable but weakens the search engine's primary
  ranking signal.

## Reason

The Linguist palette is complete, familiar from GitHub, deterministic when
pinned, and does not require runtime network access.
Using color as an accent rather than the text color preserves contrast for
very light and very dark palette values.
One title/source-link structure gives every result the same visual hierarchy
and target behavior.
Keeping relevance as the default avoids changing expected search quality while
still providing explicit language ordering.

## Consequences

- New catalog languages must have one matching valid Linguist-aligned entry in
  the static palette.
- A deliberate Linguist palette refresh changes UI data and requires visual
  review in every supported site theme.
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
