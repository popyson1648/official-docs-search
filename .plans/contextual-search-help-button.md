# Plan

## Goal

Place Search syntax help next to the Search submit button so the control is
contextual, predictable, and easy to reach without disrupting header alignment.

## Scope

- Remove the visible Search syntax action from the header.
- Add a 44 px rounded-square question-mark help button after the Search button.
- Provide localized tooltip text and dialog accessibility relationships.
- Keep EN/JA right-aligned in the header and Docs locale right-aligned below it.
- Add responsive and keyboard-focused E2E coverage.
- Audit the current page for separate UI/UX improvement opportunities.

## Non-goals

- Changing the help dialog content or search behavior.
- Replacing the visible Search label with an icon.
- Redesigning the settings, source picker, or search results.
- Implementing unrelated findings from the UI/UX audit.

## Assumptions

- Search syntax is contextual help for the query field, not a global site action.
- The search terms are normally short enough to accept the 44 px help control.
- The existing modal dialog remains the appropriate presentation for the help
  content.

## Steps

1. Move the help trigger from the header to the search group after the submit
   button.
2. Style it as a neutral 44 px icon button with a localized hover/focus tooltip.
3. Connect the trigger and dialog with accessible names and relationships while
   preserving native dialog close and focus behavior.
4. Tune narrow-width Search button sizing and keep the input usable at 320,
   375, and 390 px.
5. Update E2E assertions for order, geometry, accessible naming, keyboard
   behavior, and focus return.
6. Run focused UI checks, inspect responsive screenshots, then run repository
   verification.

## Verification

- DOM and visual order is query input, Search button, help button.
- EN/JA remains aligned to the header's right edge at all tested widths.
- The help target is at least 44 by 44 px and has an accessible localized name.
- Tooltip text appears on hover and keyboard focus.
- Activating the help button opens the labelled dialog and closing it returns
  focus to the trigger.
- Enter in the query field continues to submit search.
- The input remains usable without horizontal page overflow at 320, 375, 390,
  641, and 1280 px.
- `python3 scripts/verify.py` passes.

## Open Issues

None.
