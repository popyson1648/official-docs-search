# Plan

## Goal

Make search results easier to scan by using one consistent title-and-link
layout, recognizable programming-language colors, and optional language-name
sorting, while simplifying the back-to-top control.

## Scope

- Remove the shadow from the back-to-top button.
- Add search-result ordering choices for relevance, programming-language name
  ascending, and programming-language name descending.
- Preserve relevance order among results with the same programming language.
- Render every result with a plain-text title, a language tag immediately after
  the title, and one or more source links below it.
- Use the same result markup and styling for single-source and grouped results.
- Add a required static language color for every supported catalog language,
  kept outside the index-affecting source catalog.
- Base language colors on GitHub Linguist's current `languages.yml` values,
  using its `Shell` color for Bash and `Visual Basic .NET` color for Visual
  Basic.
- Use the palette color as a visual accent while retaining readable tag text
  for both very light and very dark language colors.
- Add English and Japanese labels for the ordering controls.
- Update tests, project documentation, templates, and a decision record.

## Non-goals

- Changing relevance scoring or fuzzy-search behavior.
- Adding title, date, source, or popularity sorting.
- Fetching GitHub Linguist data at runtime.
- Adding language logos or changing the colors of unrelated controls.
- Changing result grouping or source qualification rules.

## Assumptions

- “Filter can sort by programming-language name ascending/descending” means
  sorting the search results from the existing result-filter UI, not changing
  the order of the language choices.
- Relevance remains the default because it preserves the search engine's
  current ranking.
- The ordering control is a single-choice “Order” facet beside the existing
  Language and Site facets.
- Language-name ordering uses catalog display names and a stable collator;
  relevance order is retained as the tie-breaker.
- GitHub Linguist is the palette authority because GitHub uses Linguist for
  repository language recognition and statistics:
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-repository-languages
- The palette is pinned in a local static map rather than fetched at runtime so
  search rendering stays deterministic and offline-capable without changing
  the search-index catalog hash:
  https://raw.githubusercontent.com/github-linguist/linguist/master/lib/linguist/languages.yml

## Steps

1. Add a validated `#RRGGBB` Linguist palette keyed by every catalog language
   outside the index-affecting TOML, then expose it to client-side results.
2. Extend result-filter session state and controls with relevance, language
   ascending, and language descending ordering; keep the selection across
   in-page filter and documentation-locale changes.
3. Stably order grouped results before batching and rendering, resetting the
   visible batch after an ordering change without re-fetching indexes.
4. Refactor result rendering so all groups use a non-link heading with an
   adjacent colored language tag and the shared source-link list below.
5. Adjust result, responsive, loading-skeleton, filter, and back-to-top styles
   for the new structure.
6. Add or update unit, integration, DOM, and end-to-end coverage for catalog
   colors, ordering, uniform result markup, links, accessibility state, and
   responsive layout.
7. Record the language-color and result-layout decision; update current project
   documentation and its source template where behavior is documented.
8. Run `python3 scripts/verify.py`, inspect the page at desktop and mobile
   widths in both UI languages/themes, and perform a final regression review.
9. Commit the verified work, push it to `dev`, and monitor GitHub Actions until
   the required checks pass.

## Verification

- `python3 scripts/verify.py`
- Catalog test proving every supported language has a valid color.
- Result-filter tests covering all three ordering choices and stable
  same-language order.
- DOM/E2E assertions proving titles are never links, language tags follow
  titles, and all results use the same source-link structure.
- Browser inspection for long titles, desktop/mobile layouts, keyboard focus,
  language-color extremes, and back-to-top behavior.
- GitHub Actions check status after pushing to `dev`.

## Open Issues

- None. If the requested “ascending/descending” instead refers to ordering the
  filter's language choices rather than the results, revise Step 2 before
  implementation.
