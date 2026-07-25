# Plan

## Goal

Make the search input easier to understand and less visually harsh, while
removing misleading raw markup from optional result-section context.

## Scope

- Replace the dark, thick search-input focus outline with a clearly blue,
  lower-weight focus treatment that remains visible for keyboard users.
- Remove the example placeholder and keep a persistent support-text example.
- Change the main example to `js promise all` and explain that it searches
  JavaScript documentation for results containing both `promise` and `all`.
- Increase the vertical gap between the search input and parsed-language tags
  from 4 px to the 10 px spacing step.
- Normalize Sphinx index titles and section names to plain text before
  publication so inline HTML never appears as result text.
- Regenerate the affected Python Japanese index and manifest.

## Non-goals

- Add page-body snippets or fetch result pages at search time.
- Change AND matching, query parsing, ranking, or source selection.
- Remove visible focus indication from keyboard navigation.
- Force every result to show optional section context.

## Assumptions

- In `js promise all`, `js` selects JavaScript and `promise` plus `all` are
  both required search tokens.
- The support text must state the AND behavior directly rather than expecting
  users to infer it from the example.
- Persistent support text is preferable to placeholder-only guidance because
  it remains visible after input begins and can be associated through
  `aria-describedby`.
- The line under the affected Python result is section context, not a body
  snippet. Raw `<code>` markup in that line is an index-normalization bug.
- A 2 px blue focus indicator with at least 3:1 contrast against white removes
  the black-frame appearance while retaining a clear keyboard focus state.

## Steps

1. Add localized, explanatory main-example copy and remove the input
   placeholder.
2. Update input focus styling and parsed-tag spacing on desktop and mobile.
3. Normalize Sphinx titles and section labels through HTML-to-text conversion.
4. Add parser and browser regressions for clean section text, persistent
   guidance, focus color/width, and 10 px tag spacing.
5. Regenerate the Python Japanese index and review the artifact diff.
6. Run focused tests, desktop/mobile browser inspection, and the full
   repository verification workflow.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- Desktop and 375 px browser inspection
- `git diff --check`
- `python3 scripts/verify.py`

## Open Issues

- None.
