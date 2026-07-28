# Plan

## Goal

Match the result-filter choice panel to the pill-shaped control language used
by `popyson1648/popyson-io`, while making each result language tag use its full
GitHub Linguist color with readable black or white text.

## Scope

- Change the floating result-filter choice panel opened by Language, Site, or
  Order to a fully pill-shaped container.
- Keep its individual choices as pills and preserve the current wrapping,
  overlay behavior, focus management, animation, and mobile containment.
- Keep the main search input and search-suggestion surfaces as rounded
  rectangles.
- Remove the colored dot from every result language tag.
- Use the exact pinned GitHub Linguist color as the whole tag background and
  border.
- Derive either black or white tag text from the background's relative
  luminance, choosing the higher-contrast option.
- Add contrast, DOM, desktop, mobile, and reduced-motion regression coverage.
- Classify newly added root-level unit tests so change-aware verification runs
  only their required type-check and unit-test phases.
- Update the existing result-layout decision and current project/template
  documentation.

## Non-goals

- Changing GitHub Linguist color values.
- Changing filter state, sorting behavior, result ranking, or source links.
- Changing active-filter pills outside the floating choice panel.
- Restyling the search form, search button, help button, or search suggestions.
- Adding a site theme or language logos.

## Assumptions

- “Window shown after clicking Order and similar controls” means
  `.result-filter-panel`.
- “Only the search window stays a rounded rectangle” means that search inputs
  and search-result/suggestion popups do not adopt the `999px` panel radius.
- The relevant `popyson-io` pattern is its pill filter/sort panel and nested
  pill controls (`.fpanel`, `.menu-item`, and `.seg-mini`), distinct from its
  rounded-rectangle search surfaces.
- Black/white selection uses WCAG relative luminance and selects the foreground
  with the larger contrast ratio rather than relying on a subjective brightness
  threshold.

## Steps

1. Add a pure color helper that validates `#RRGGBB`, calculates sRGB relative
   luminance, and returns black or white for maximum contrast.
2. Pass the derived foreground color with the existing Linguist background
   color to every result language tag.
3. Remove the language-tag dot and color-mix treatment; apply the exact
   Linguist color to the tag background and border.
4. Change only the result-filter choice panel to a `999px` radius and tune its
   padding so wrapped choices remain visually centered without clipping.
5. Add unit tests covering all 44 colors, both foreground outcomes, and minimum
   contrast; update E2E assertions for solid tags and the pill panel.
6. Update the existing UI decision, project testing notes, and source
   templates.
7. Keep the project and verification templates aligned so a new root-level
   unit test is not treated as an unknown implementation path.
8. Run `python3 scripts/verify.py`, inspect desktop and 375px mobile layouts
   with one-row and wrapped filter choices, and check keyboard/reduced-motion
   behavior.
9. Commit the verified change, push it to `dev`, and monitor GitHub Actions to
   completion.

## Verification

- `python3 scripts/verify.py`
- Unit assertion that every catalog language retains its exact Linguist color
  and receives the higher-contrast black or white foreground.
- E2E assertion that language tags have no marker, use solid colors, and keep
  titles and source links unchanged.
- E2E assertion that the filter panel is fully pill-shaped while search
  surfaces retain rounded-rectangle radii.
- Browser inspection at desktop and 375px widths, including wrapped choices,
  long language names, horizontal overflow, focus, and reduced motion.
- GitHub Actions status after pushing to `dev`.

## Open Issues

- None.
