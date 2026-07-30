# Plan

## Goal

Add a persistent Light, Dark, and System appearance selector to the left of the
existing EN/JA control without changing the search workflow or page structure.

## Scope

- Add one compact icon button immediately left of the language control.
- Open a localized dropdown with options in the requested order:
  Dark theme, Light theme, and System.
- Use `menuitemradio` semantics for the exclusive choices and implement the WAI
  menu-button keyboard contract.
- Make System the default for users who have not selected a theme.
- Persist the explicit setting in an `ods_theme` cookie so SSR can render the
  correct theme before first paint.
- Let System follow `prefers-color-scheme` immediately, including later OS
  changes.
- Keep the current light palette unchanged.
- Add a dark purple palette derived from the light hierarchy:
  - background `#100D18`
  - surface `#201A32`
  - primary text `#F4F1FF`
  - result text `#F7F5FF`
  - secondary text `#D3CBE8`
  - muted text `#AAA0C2`
  - control border `#706191`
  - strong border `#8876A8`
  - brand accent `#825CFF`
  - accessible filled-action accent `#7951EF`
  - link accent `#BCAAFF`
  - focus accent `#A78BFA`
  - highlighted query background `#392A62`
  - error text `#FF7B72`
- Theme every current surface, result, control, dropdown, dialog, skeleton, and
  browser-provided form control while leaving catalog language colors intact.
- Keep the transparent logo unchanged and verify it against both backgrounds.
- Update `color-scheme` and `theme-color` metadata for Light, Dark, and System.

## Non-goals

- Do not redesign the header, search form, filters, results, or source picker.
- Do not add a fourth automatic mode or time-based switching.
- Do not recolor language identity tags or the supplied brand images.
- Do not add page transitions or full-page color animations.
- Do not change the top-page-only product-entry policy.
- Do not alter result ranking, source selection, indexes, or upstream URLs.

## Assumptions

- System is the recommended initial setting; on a light OS the site remains
  visually identical to the current light theme.
- The earlier requirement to keep result text black applies to the light theme.
  Dark mode uses near-white result text so it remains readable.
- The requested white Search-button text remains unchanged. Its current light
  theme contrast ratio against exact `#825CFF` remains the previously reported
  4.26:1 exception; the dark theme can use a slightly darker purple fill.
- Theme persistence does not require local storage because the existing SSR
  response already varies by Cookie.

## Steps

1. Add and test a small theme-setting parser for `light`, `dark`, and `system`.
2. Resolve the saved cookie on the server and emit the theme setting on the
   root element before CSS is applied.
3. Refactor literal light-only colors into semantic tokens and add the reviewed
   dark token set under explicit-dark and system-dark selectors.
4. Add early `color-scheme` metadata and setting-aware browser `theme-color`
   metadata to avoid light browser chrome around a dark page.
5. Add the icon-only menu button to the left of EN/JA and render localized
   `menuitemradio` choices for Dark, Light, and System.
6. Add a focused client controller for open/close, selection, cookie
   persistence, focus restoration, outside click, Escape, arrow keys, Home,
   End, and current-state icon/labels.
7. Update unit, production-server, and browser tests for SSR persistence,
   system preference, live OS changes, keyboard behavior, mobile containment,
   color tokens, and unchanged search behavior.
8. Verify both themes at desktop and 375 CSS-pixel mobile widths, including
   menus, source cards, filter overlays, dialogs, loading states, and results.
9. Run Lighthouse and production performance traces in both schemes, then run
   the repository verification selected by the changed paths.
10. Update short project structure, testing, and performance documentation.

## Verification

- Run `python3 scripts/verify.py` with the exact changed-file scope.
- Check every dark text/background pair against WCAG 2.2 AA: 4.5:1 for normal
  text and 3:1 for required control indicators.
- Confirm explicit Light and Dark override the emulated OS scheme.
- Confirm System changes when `prefers-color-scheme` changes without reload.
- Confirm a saved setting survives reload and invalid cookies fall back to
  System.
- Confirm the menu button precedes EN/JA, remains inside the viewport down to
  320 CSS pixels, and does not shift the centered logo.
- Confirm Enter, Space, arrows, Home, End, Escape, outside click, and focus
  restoration follow the menu-button contract.
- Confirm no flash-colored layout shift, horizontal overflow, result-ranking
  change, or added search-index request.
- Compare light screenshots to the current theme and inspect dark screenshots
  for all major UI states.

## Open Issues

- None.

## Research Basis

- MDN documents `prefers-color-scheme` as the stable way to follow the operating
  system preference.
- MDN and web.dev recommend declaring `color-scheme` in CSS and metadata so
  browser-provided controls and the initial canvas match before styles finish
  loading.
- MDN supports media-aware `theme-color` metadata for light and dark browser
  chrome.
- WAI-ARIA APG defines `button`, `aria-haspopup="menu"`, `aria-expanded`, a
  `menu`, and radio menu items with managed focus for this interaction.
- WCAG 2.2 requires 4.5:1 normal-text contrast and 3:1 for required non-text
  control indicators.
