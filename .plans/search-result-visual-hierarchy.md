# Plan

## Goal

Give search results a clear Google-like reading order, reuse the source-kind
badge treatment from the source picker, make active query tags compact and
pill-shaped, and reduce the visual prominence of the result count.

## Scope

- Reorder every search result into this visual hierarchy:
  1. programming language, documentation language, and source-kind badges;
  2. source name and visible URL;
  3. linked page title;
  4. section and localized qualification as secondary annotations.
- Reuse one source-kind badge style for `Official`, `Conventional`, and
  `Community` in both the source picker and search results.
- Remove dot-separated result metadata and use spacing, badges, font size,
  weight, and color to distinguish roles.
- Keep the original safe HTTPS result URL and linked page title behavior.
- Make active language tags removable input chips:
  - fully pill-shaped container;
  - approximately 28–30 px total height instead of the current 46 px;
  - 12 px label;
  - visually clearer close glyph inside a minimum 24×24 px removal target;
  - compact horizontal and vertical spacing.
- Render the successful `N results` status as small inline secondary text
  without a full-width bordered background.
- Preserve distinct loading, empty, and error states; errors remain visibly
  emphasized.
- Add desktop and mobile UI regression coverage for DOM order, shared badge
  styling, typography hierarchy, chip dimensions, removal-target size, and
  result-count dimensions.

## Non-goals

- Copying Google Search branding, exact colors, favicon layout, or proprietary
  presentation.
- Adding snippets or descriptions that are not present in the search index.
- Changing ranking, source selection, result limits, URLs, or search-index
  generation.
- Changing the search form controls outside active tags and the result-count
  status.

## Assumptions

- Google Search's documented result anatomy is the appropriate structural
  reference: attribution/visible URL and title link are separate result
  elements.
- The requested order places classification badges above the source/URL line,
  and both above the linked title.
- `sourceName` is the site attribution; the existing full result URL remains
  the visible URL.
- A compact close glyph still needs at least a 24×24 CSS-pixel target.
- Secondary text will continue using the existing `--text-2` and `--muted`
  colors because they remain readable against the white background.

## Steps

1. Refactor result rendering into semantic classification, attribution,
   title, and annotation containers while keeping all external text assigned
   through DOM text APIs.
2. Extract a shared source-kind badge class and apply it in the source picker
   and search results.
3. Replace dot separators with role-specific layout and typography:
   - classification badges around 11–12 px;
   - source name around 13 px with medium weight;
   - visible URL around 12 px in a muted color;
   - title around 19–20 px with medium weight and accent color;
   - section/qualification around 12–13 px as annotations.
4. Restyle active tags as 28–30 px pill-shaped input chips, override inherited
   button minimum height, enlarge the visible close glyph, and retain a
   minimum 24×24 px removal target.
5. Restyle successful result count as compact inline muted text while retaining
   explicit loading, empty, and error treatments.
6. Update E2E and rendering assertions for order, hierarchy, shared badges,
   accessibility, desktop/mobile reflow, and removal behavior.
7. Update project testing documentation, run complete verification, and inspect
   desktop and mobile screenshots.

## Verification

- Run `python3 scripts/verify.py`.
- Run `git diff --check`.
- On desktop and 375/390 px mobile widths, verify:
  - classification badges precede the source/URL line;
  - source/URL precedes the page title;
  - annotations follow the title;
  - page title is visibly larger and darker/more saturated than annotations;
  - source-kind badges match those in the source picker;
  - long URLs and qualifications wrap without horizontal overflow.
- Assert active chips are at most 30 px high, use a fully rounded radius, and
  keep the remove target at least 24×24 px with a visible focus state.
- Assert the successful result count has no border/background box, is not
  full-width, and is smaller than the result title.
- Confirm keyboard activation still removes a tag and submits the updated
  query.
- Confirm result title links remain HTTPS, open in a new tab, and include
  `noopener`.

## Open Issues

- The index contains titles, URLs, optional sections, and qualifications but no
  content snippets, so the result layout cannot include a Google-style summary
  without a separately reviewed index expansion.
