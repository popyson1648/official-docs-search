# Plan

## Goal

Correct the language-tag foreground rule and reproduce the current
`popyson1648/popyson-io` filter geometry instead of applying one oversized pill
radius to the choice popup.

## Scope

- Replace the “always choose the higher WCAG contrast” foreground rule with a
  visual light/dark rule that renders the C++ tag (`#f34b7d`) with white text.
- Keep the exact pinned GitHub Linguist background colors.
- Restore the choice popup to the 18px rounded-rectangle geometry used by
  `popyson-io`'s `.fbar-pop`.
- Keep the compact filter toolbar itself pill-shaped.
- Keep Language, Site, and Order controls in one horizontal segmented row.
- Render choice items as compact horizontal chips; wrap them into balanced rows
  on wider layouts and use horizontal overflow on narrow layouts rather than
  degrading into a one-item-per-row vertical list.
- Correct the existing decision and project documentation that inaccurately
  described the `popyson-io` popup as pill-shaped.
- Add regression coverage for C++ text color, popup geometry, horizontal choice
  layout, overflow, keyboard behavior, and reduced motion.

## Non-goals

- Changing GitHub Linguist background color values.
- Changing filter state, available facets, result ranking, or source labels.
- Replacing the current filter controller with the React implementation from
  `popyson-io`.
- Restyling result titles, source rows, the main query field, or search
  suggestions.

## Assumptions

- The current rendered `popyson-io` structure in `src/blog.jsx` and its final
  CSS overrides are authoritative:
  - `.fbar-controls` is the compact pill toolbar.
  - `.fbar-inline`, `.fbar-fields`, and `.seg-mini` keep toolbar items
    horizontal.
  - `.fbar-pop` is the separate 18px rounded-rectangle choice popup.
  - `.fbar-chips` contains compact inline choices.
- The requested white C++ label takes precedence over choosing the numerically
  larger WCAG contrast ratio.
- C++ `#f34b7d` has approximately 6.11:1 contrast with black and 3.44:1 with
  white. White therefore does not meet WCAG AA for the current small tag text;
  this is an explicit visual-design tradeoff unless the background color or tag
  size is also allowed to change.

## Steps

1. Replace the maximum-contrast helper with a documented perceptual light/dark
   foreground rule and add fixtures for C++, TypeScript, Python, JavaScript,
   and every catalog color.
2. Restore the choice popup's 18px radius and compact padding while retaining
   the pill toolbar and pill choice buttons.
3. Keep facet controls horizontal and make long Site/Order choices form compact
   horizontal rows; on a 375px viewport, preserve one horizontal strip with
   overflow instead of one item per row.
4. Update E2E tests to distinguish the pill toolbar from the rounded-rectangle
   popup and assert horizontal desktop/mobile choice placement.
5. Correct the accepted decision, project documents, and templates.
6. Run `python3 scripts/verify.py` and visually inspect Language, Site, and Order
   at desktop and 375px widths.
7. Commit the verified fix locally without pushing it.

## Verification

- `python3 scripts/verify.py`
- Unit tests for foreground selection and the exact C++ white-text outcome.
- E2E checks for:
  - compact pill toolbar;
  - 18px popup radius;
  - horizontal facet and choice ordering;
  - narrow-viewport containment and horizontal overflow;
  - unchanged outside-click, Escape, focus restoration, and reduced motion.
- Browser screenshots at desktop and 375px for Language, Site, and Order.
- Confirm that the local commit was not pushed.

## Open Issues

- White text on the unchanged C++ Linguist background is 3.44:1 and therefore
  cannot meet the 4.5:1 small-text contrast threshold without changing at least
  one of the requested visual constraints.
