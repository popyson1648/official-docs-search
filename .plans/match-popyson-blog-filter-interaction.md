# Plan

## Goal

Make the result filter behave like the filter implementation on
`https://popyson.com/blog/`, while retaining this application's current color
palette and its language/site filtering semantics.

## Scope

- Port the filter-specific interaction model from
  `popyson1648/popyson-io/src/blog.jsx` and its current `src/app.css` rules.
- Replace the text-heavy collapsed control with the same compact icon-button
  disclosure inside a rounded, content-sized controls pill.
- Morph the controls pill on open:
  - replace the filter trigger with an icon-only back control;
  - keep the `Language` / `Site` property selectors visible in the pill;
  - animate expansion for 260 ms and collapse for 180 ms with the reference
    easing;
  - fade and slide swapped content for 220 ms unless reduced motion is
    requested.
- Render filter choices in an absolutely positioned popup 8 px below the
  controls pill so opening it overlays the result list instead of moving
  results.
- Match the reference closing and focus behavior:
  - opening focuses the back control without scrolling;
  - the back control closes and restores focus to the filter trigger;
  - `Escape` closes and restores focus to the trigger;
  - a pointer press outside the complete filter region closes without stealing
    focus back;
  - changing `Language` / `Site` or toggling choices does not close the popup.
- Use the reference property-selector semantics: a labeled button group with
  stable labels and `aria-pressed`, not tabs.
- Keep multi-select chips with `aria-pressed`; retain OR-within and AND-across
  filtering and cached in-page re-search.
- Match the reference applied-filter state:
  - one applied pill per facet, not one pill per selected value;
  - show the facet label and a comma-separated value summary;
  - one remove button clears the complete facet;
  - keep `Clear all` beside the applied pills;
  - mark the collapsed filter trigger as active when any filter is applied.
- Match the reference responsive behavior:
  - keep the same compact control geometry on desktop and touch devices;
  - constrain the popup to the viewport;
  - wrap choice chips;
  - enlarge choice padding on coarse-pointer devices;
  - disable nonessential motion for `prefers-reduced-motion`.
- Keep current English/Japanese labels, current colors, exact full-match facets,
  Docs-locale selection preservation, counts, and fallback notices.

## Non-goals

- Copy the reference site's colors, blur, shadows, or decorative background.
- Add unrelated Search or Sort toolbar actions from the blog.
- Add title/body free-text facets; this application keeps `Language` and
  `Site`.
- Change query parsing, source selection, ranking, URL state, or index data.
- Convert the application to React or import code directly from the other
  repository.

## Assumptions

- “The same filter UI” means the filter control's state transitions, layout,
  motion, dismissal, focus management, applied-state grouping, responsive
  behavior, and accessibility states; unrelated blog Search and Sort actions
  should not be added.
- The current application remains framework-light, so the React behavior will
  be reproduced in the existing TypeScript DOM controller.
- The current palette remains authoritative even where the reference CSS uses
  frosted backgrounds or accent fills.
- Async filtering must leave the popup open and keep the clicked control
  focused while the worker refreshes results.

## Steps

1. Refactor the filter DOM controller around the reference `openPanel`,
   outside-pointer, Escape, back-focus, and grouped-applied-filter behavior.
2. Replace tab semantics with the reference labeled `aria-pressed` property
   group while keeping native buttons and bilingual accessible names.
3. Port the reference morphing-pill and overlay-popup layout, motion timings,
   viewport limits, coarse-pointer adjustments, and reduced-motion behavior
   into the current color system.
4. Preserve the current worker-backed filtering callback and stale-response
   protection while keeping the panel state stable during asynchronous
   updates.
5. Update E2E tests to compare the local interaction against the inspected
   reference behavior: no result reflow, outside dismissal, Escape/back focus,
   grouped facet pills, active indicator, unchanged URL, mobile containment,
   and reduced motion.
6. Run desktop, 375 px, keyboard, pointer, and reduced-motion browser
   inspection, then run the complete repository verification workflow.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- Compare live `popyson.com/blog/` and local behavior at 1280 px and 375 px
- Verify opening does not change the first result's vertical position
- Verify outside pointer, `Escape`, back, facet switching, chip toggling,
  grouped removal, clear-all, and focus restoration
- Verify `prefers-reduced-motion` behavior
- `git diff --check`
- `python3 scripts/verify.py`

## Open Issues

- None.
