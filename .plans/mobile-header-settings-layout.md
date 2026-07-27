# Plan

## Goal

Make the header hierarchy and mobile settings layout predictable:

- center the page title;
- place the EN/JA UI-language control to the right of Search syntax;
- align every mobile settings control to the right edge;
- make only the actual switches, not their explanatory text, clickable;
- shorten the automatic non-official fallback setting without losing its meaning.

## Scope

- Restructure the header and settings markup in `src/pages/index.astro`.
- Adjust responsive header and settings styles in `public/styles.css`.
- Change the Japanese fallback setting text to:
  `ウェブで読める公式リファレンスがない場合、非公式リファレンスを使う`
- Shorten the matching English text while preserving the same behavior.
- Add desktop and mobile E2E assertions for geometry, control order, click targets,
  keyboard naming, and wrapping.
- Update current-state project documentation and its template where the layout
  contract is described.

## Non-goals

- Changing search behavior, source selection persistence, or Docs-locale behavior.
- Changing the source picker rows, where source names remain explicit labels for
  their individual source checkboxes.
- Redesigning colors, typography, or result cards.

## Assumptions

- “Docsのボタン” means the All/EN/JA Docs-locale segmented control.
- On desktop the title remains geometrically centered while actions stay at the
  right.
- On mobile the centered title may occupy its own row, with `検索方法` followed
  by EN/JA on the next right-aligned row.
- The shorter setting text must still state both the condition (no official web
  reference) and the action (use a non-official reference).

## Steps

1. Reorder header actions to Search syntax then EN/JA and use a three-column
   desktop grid so the title is centered independently of action width.
2. Use a two-row mobile header: centered title first, right-aligned actions
   second, retaining the same action order.
3. Replace each switch-wrapping label with a settings row containing separate
   explanatory text and checkbox. Connect them with `aria-labelledby` so the
   switch keeps an accessible name while the text is no longer clickable.
4. Make mobile settings rows full width with controls aligned to the right edge;
   apply the same alignment to the Docs-locale segmented control.
5. Update localized fallback-setting text and layout documentation.
6. Add E2E coverage at desktop and 375/390 px mobile widths, then run focused UI
   checks, visual screenshot inspection, and `python3 scripts/verify.py`.

## Verification

- Header action order is Search syntax, EN, JA in the DOM and visually.
- The title midpoint matches the search panel midpoint on desktop and mobile.
- At mobile widths, both switches and the Docs segmented control share the
  settings row's right edge regardless of text length.
- Clicking the explanatory text does not change either switch.
- Clicking or keyboard-operating each switch still changes the intended setting,
  and each input has the correct accessible name.
- The shorter Japanese and English setting text renders without overflow at
  375 px and 390 px.
- Existing search, source selection, Docs locale, focus, and navigation tests
  continue to pass.
- Full repository verification passes.

## Open Issues

None.
