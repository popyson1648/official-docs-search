# Plan

## Goal

Restore a clear, compact search-result hierarchy in which each grouped symbol
title is the dominant boundary, its source destinations are visibly subordinate,
and secondary controls do not compete with the results.

## Scope

- Replace bordered source cards inside grouped results with compact, flat links.
- Remove repeated top-level result dividers and use whitespace plus headings to
  separate result groups.
- Reduce the source-qualification disclosure to a small, borderless details
  control below the result count and filters.
- Restore the result-filter trigger's previous icon-only pill shape and motion.
- Add a localized bottom-right Top control that appears only after scrolling
  away from the page header.
- Update responsive, interaction, accessibility, and visual-hierarchy tests.
- Update the current-state documentation, templates, and decision history.

## Non-goals

- Change search ranking, grouping identity, source selection, or the 15-result
  progressive-disclosure behavior.
- Remove source provenance, locale, source kind, or safe external links.
- Add sticky navigation, infinite scrolling, or a persistent floating primary
  action.
- Restyle the search form or source picker.

## Assumptions

- The Google Search text-result and sitelink hierarchy is a better fit than
  nested cards: one dominant result title with compact subordinate links.
- A heading and whitespace should define each top-level group; adding a divider
  as a second grouping signal creates unnecessary visual noise.
- Source qualifications are secondary reference material and should use a
  small details disclosure rather than a bordered card.
- Restoring the filter shape means restoring the 42-pixel outer pill and
  34-by-32-pixel icon trigger with a screen-reader label.
- The Top control is an enhancement for long pages: it remains absent near the
  header, appears at the bottom right after the header leaves view, and moves
  focus to the page heading when activated.

## Steps

1. Refactor grouped-source markup into one-line or wrapping text links whose
   source name is primary and locale, source kind, section, and external-link
   marker are muted inline metadata.
2. Remove source-link borders, backgrounds, and card radii; remove top-level
   result borders; tighten vertical padding while preserving a readable gap
   between group titles.
3. Make grouped titles visually stronger than source links and verify that
   group boundaries remain clear at desktop and mobile widths.
4. Restyle the source-qualification details as a compact borderless disclosure
   no larger or more prominent than the existing Sources disclosure.
5. Restore the pre-change result-filter trigger markup and dimensions while
   preserving its accessible name, active indicator, focus behavior, overlay,
   and applied filters.
6. Add a localized Top control with an up-arrow, fixed safe-area-aware
   bottom-right placement, scroll-triggered visibility, reduced-motion-safe
   transitions, and focus restoration to the page heading.
7. Extend E2E coverage for hierarchy, dimensions, absence of nested card
   borders, restored filter geometry, disclosure prominence, Top visibility,
   scrolling, focus, localization, reduced motion, and horizontal overflow.
8. Inspect the real UI at 320, 375, 390, 641, and 1280 CSS pixels, run
   `python3 scripts/verify.py`, review the final diff, commit, push to `dev`, and
   monitor CI.

## Verification

- `std::sort` remains one group with separate cpprefjp and cppreference links,
  but neither destination is rendered as a card.
- The `std::sort` heading is visually stronger than every nested source link.
- Top-level groups have no repeated divider lines and remain distinguishable by
  title and spacing.
- The source-qualification disclosure has no outer card and is not taller or
  more prominent than the Sources disclosure.
- The result-filter trigger matches its previous icon-only pill geometry and
  keeps its localized accessible name.
- The Top control is absent at page start, appears at the bottom right after
  scrolling, returns to the heading, and is keyboard accessible.
- Reduced-motion users receive no show/hide or smooth-scroll animation.
- Result links, grouping, filtering, load-more behavior, and locale notices
  continue to work without horizontal overflow.
- Local verification and GitHub Actions pass.

## Open Issues

None.
