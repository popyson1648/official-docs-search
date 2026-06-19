# Plan - Fix Search UI Layout, Results, and Language Tags (Iteration 3)

## Goal

Fully align the layout and components with the user's specific aesthetics and design constraints:
1. **Remove badges from results**: Stop adding tags/badges to search result titles.
2. **`popyson.com/blog` Pill Tags**: Replace active tags styling with `.fpill` layout rules (compact borders, subtle background, explicit hover-able close cross button `.fpill-x`) matching the popyson.com/blog tags.
3. **Pill-shaped Toggle for Non-official Sources**: Style the checkbox as a sliding pill-shaped toggle switch using the pre-existing `.pill-toggle` rules.
4. **Segmented Float Toggle for Docs Locale**: Redesign the Docs Locale selector from large separate buttons into a compact segmented selector (like the UI lang switcher) where the active element's background floats cleanly.

## Scope

- Modify `src/pages/index.astro` to:
  - Remove all client-side JavaScript rendering of search result tags/badges.
  - Re-render active query language tags using the `.fpill` class structure.
  - Convert "Include non-official sources" checkbox markup to trigger the `.pill-toggle` styling.
  - Convert "Docs Locale Selector" radio button labels into a `.seg-toggle` fieldset.
- Modify `public/styles.css` to:
  - Remove result language badge classes (`.lang-badge` etc.).
  - Implement `.fpill`, `.fpill-label`, and `.fpill-x` styling rules matching popyson.com/blog.
  - Format the Non-official toggle row to align cleanly with the pill switch.
  - Add `.seg-toggle` and `.seg-btn` segmented controller styling.

## Assumptions

- "Float toggle" refers to a segmented layout selector where the selection background floats on top of the container (similar to `seg-mini` / `.lang-switch`).
- Reverting results tag injection ensures cleanest native Google CSE title listings.

## Steps

1. **Update Plan**: Document these requirements (done).
2. **Revert Search Result Badge Logic**: Clean up JS script and XML/HTML dataset markers from `src/pages/index.astro` and CSS from `public/styles.css`.
3. **Style Active Tags as `.fpill`**:
   - Update markup in `src/pages/index.astro` to use `.fpill`, `.fpill-label`, and `.fpill-x` classes.
   - Insert their CSS properties matching popyson.com/blog into `public/styles.css`.
4. **Convert Non-official switch to `.pill-toggle`**:
   - Align checkbox layout horizontally and attach the sliding pill switch look.
5. **Convert Docs Locale to Segmented Toggle**:
   - Wrap Doc locale options in a compact `.seg-toggle` row.
6. **Verify**: Run tests and capture screenshot to verify correctness.

## Verification

- Run unit tests with `python3 scripts/verify.py`.
- Visually verify layout details via Puppeteer screenshots.
