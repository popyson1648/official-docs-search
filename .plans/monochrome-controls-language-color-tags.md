# Plan

## Goal

Restore the site's monochrome control language while reserving GitHub Linguist
colors for programming-language identity tags.

## Scope

- Remove blue/lavender styling from the result-filter trigger state, active
  facet underline, choice buttons, active filter controls, and clear action.
- Render non-language filter choices in neutral white, gray, and near-black
  states.
- Render Language filter choices with the same exact Linguist background and
  brightness-derived black/white text as result language tags.
- Make checked and unchecked settings toggles monochrome, including keyboard
  focus presentation.
- Color only the language-name segment of each query language chip below the
  search form.
- Keep the query chip's remove-button segment in its current neutral surface
  and divider treatment.
- Preserve all filter, toggle, query-removal, keyboard, and responsive behavior.
- Update regression tests and current project/design documentation.

## Non-goals

- Changing outbound link styling or the query syntax highlighter.
- Changing the Linguist palette or foreground-selection rule.
- Coloring Site or Order filter choices.
- Changing search ranking, result layout, source selection, or filter state.
- Pushing the changes.

## Assumptions

- “Language tags” includes result language tags, Language choices in the result
  filter, and language-name segments below the search form.
- Applied Site/Order filters and generic filter controls remain monochrome.
- A selected Language choice keeps its language color and uses a monochrome
  outline plus `aria-pressed` for selection state rather than replacing the
  language color.

## Steps

1. Add optional Linguist color metadata to result-filter language choices and
   apply the shared foreground helper.
2. Replace filter-specific blue/lavender states with neutral design tokens.
3. Replace settings-toggle on/off and focus colors with neutral states.
4. Pass each parsed query language's color to its chip and color only the label
   segment.
5. Add unit/E2E assertions for language-only color ownership, neutral filter
   states, neutral toggles, and the split query chip.
6. Update the existing language-color/filter decision and project/template
   testing notes.
7. Run `python3 scripts/verify.py` and inspect desktop and 375px layouts.
8. Commit all verified changes locally and leave them unpushed.

## Verification

- `python3 scripts/verify.py`
- Language filter choices match result-tag background and text colors.
- Site and Order choices contain no blue/lavender active or inactive colors.
- Checked settings toggles use a near-black track; unchecked tracks are gray.
- Query chips color the label segment only and retain a neutral remove segment.
- Keyboard focus and 375px horizontal filter overflow remain usable.
- `git rev-list --left-right --count HEAD...origin/dev` remains `0 0`.

## Open Issues

- The previously documented C++ white-text contrast tradeoff remains unchanged.
