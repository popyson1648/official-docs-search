# Plan

## Goal

Refine the Official Docs Search UI so working software engineers can search quickly, read results without distraction, and reach advanced controls only when they need them.

## Scope

- Search page layout and copy in `src/pages/index.astro`, `public/styles.css`, and `src/core/i18n.ts`.
- Remove or demote explanatory text that describes implementation state rather than user tasks.
- Make the primary search flow visually dominant: query field, submit action, compact scope/locale controls, then results.
- Move non-official source selection behind a compact advanced disclosure instead of a large default control region.
- Keep existing query syntax support, cookies, Google Programmable Search integration, and source-resolution behavior unless a small adjustment is needed for the redesigned controls.
- Preserve accessibility basics: visible labels or accessible names, keyboard operation, focus treatment, and usable target sizes.

## Non-goals

- Changing the search provider or adding a self-hosted index.
- Expanding the source catalog.
- Reworking parser semantics beyond preserving the existing `source:official` and `source:all` options.
- Adding a design framework dependency.
- Merging automatically.

## Research Basis

- NN/g heuristic guidance: keep interfaces focused on essentials, reduce irrelevant information, use users' language, and support efficient expert use.
- NN/g search guidance: search should be a visible, simple box; advanced search and scoping should be deemphasized unless clearly needed.
- NN/g progressive disclosure guidance: initially show only important options and disclose specialized options on request.
- Fluent 2 guidance: use one primary button, keep secondary actions visually quieter, use switches only for immediate settings changes, and keep checkbox labels concise and scannable.
- GOV.UK Design System guidance: use checkboxes for multi-selection, group related choices, and avoid relying on visual distinction alone.
- WCAG 2.2 target-size guidance: pointer targets should meet at least the 24-by-24 CSS pixel minimum, with larger controls for primary actions where practical.

## Assumptions

- The default user intent is official documentation search.
- Non-official sources are an advanced broadening action, not a first-run decision.
- Expert users are comfortable with terse controls and query flags when the core path stays obvious.
- The UI should feel like a professional search tool, not onboarding or marketing content.

## Steps

1. Audit the current search page for text, controls, and layout elements that compete with the core search task.
2. Redesign the first viewport around a dense search command area:
   - compact title or brand
   - visible query input with persistent label
   - one primary search button
   - concise locale and UI-language controls
3. Replace the large non-official-source toggle/hint area with a compact `Sources` disclosure or secondary control:
   - default state communicates official-only through selected scope, not explanatory prose
   - expanded state shows source checkboxes only when broadening is requested
   - checkbox labels stay short and source metadata becomes secondary
4. Tighten visual hierarchy and spacing:
   - reduce oversized control blocks
   - use restrained borders, consistent radii, stable control heights, and clearer focus states
   - keep mobile layout compact without text overflow
5. Revise UI copy in English and Japanese so labels describe user actions or state, not internal behavior.
6. Smoke-test the page visually in desktop and mobile widths, then run repository verification.

## Verification

- `python3 scripts/verify.py`
- Local dev-server smoke test.
- Browser screenshot review for desktop and mobile layouts.
- Keyboard/focus smoke test for query input, submit button, selects, disclosure, source checkboxes, and help dialog.

## Open Issues

- Final visual quality depends on seeing the page with real Google results; if the local environment lacks `PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX`, verify the non-result and generated-result containers locally and note the gap.
