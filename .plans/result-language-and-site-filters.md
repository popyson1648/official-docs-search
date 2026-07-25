# Plan

## Goal

Let users narrow a multi-language search by programming language and by
documentation site, using the compact filter interaction from
`https://popyson.com/blog/` without crowding the result list.

## Scope

- Shorten the persistent search example to `Example: js promise all` /
  `例：js promise all`.
- Move the multi-token AND-search explanation into the search-syntax help,
  where it is available when needed instead of repeated under every search.
- Add a compact filter control above the result list.
- Match the reference interaction: an inline filter panel, facet selector
  buttons, multi-select pill buttons, removable applied-filter pills, and a
  clear-all action.
- Provide two facets:
  - `Language` / `言語`
  - `Site` / `サイト`
- Build facet options from every source that has at least one match for the
  original query, including matches beyond the displayed result limit.
- Re-run the existing local index search against the selected source subset so
  filtering is applied to the full matching set rather than hiding only the
  currently displayed 60 results.
- Treat selections within one facet as OR and selections across facets as AND.
- Keep an empty facet selection equivalent to `All`.
- Update result count, empty state, and source availability/fallback notices
  after every filter change.
- Keep filter state client-side for the current result page, matching the
  reference site. A new query resets it; a document-locale change preserves
  compatible selections and removes only choices that no longer have matches.
- Localize all visible labels and accessible names in English and Japanese.

## Non-goals

- Add search, sort, or other toolbar actions that do not currently exist.
- Add filter parameters to the URL or persist filters across navigation,
  reloads, or sessions.
- Change query parsing, ranking weights, or the existing AND-search semantics.
- Fetch result pages or add body-content snippets.
- Add filters to searches that have no result facet choices.

## Assumptions

- The full explanatory sentence under the main form is unnecessary once the
  short example remains visible and the AND rule is documented in search help.
- A documentation source is the correct unit for the `Site` facet because it
  matches the source attribution shown on every result and the existing source
  selection model.
- Selected language values are ORed with each other, selected site values are
  ORed with each other, and the two facet groups are combined with AND.
- Immediate client-side updates are appropriate because index bundles are
  cached by the page-lifetime search worker.
- Applied filters must remain visible and individually removable even while the
  filter panel is closed.
- Native buttons with stable labels and `aria-pressed` communicate selectable
  pill state; the disclosure button uses `aria-expanded` and
  `aria-controls`.
- Because this feature initially has only one top-level action, it should use a
  normal labeled control group rather than `role="toolbar"`. The mutually
  exclusive `Language` / `Site` views use tab semantics.
- The result count and applied-filter summary make the current state explicit,
  including a recoverable zero-result state.

## Steps

1. Extend stored-index search results with exact matching language/source
   facets while preserving the existing ranked-record API.
2. Expose language metadata with requested sources and return facet metadata
   through the runtime and worker boundary.
3. Add per-page filter state and filtered search execution in the result
   client, with stale-request protection.
4. Render the compact localized filter control bar, inline facet panel, selectable
   pills, applied-filter pills, individual removal, and clear-all behavior.
5. Style the controls to follow the reference site's compact pill geometry and
   wrapping behavior on desktop and mobile while retaining visible keyboard
   focus.
6. Shorten the persistent example and add one concise multi-token AND rule to
   the search-syntax help.
7. Add unit, runtime, and E2E coverage for exact facets, OR/AND behavior,
   result and notice updates, filter removal/reset, accessibility state, and
   mobile wrapping.
8. Update project testing documentation, run desktop/mobile browser
   inspection, and run the full repository verification workflow.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:integration`
- `npm run test:e2e`
- Desktop and 375 px browser inspection against the production build
- Keyboard inspection for disclosure, facet, pill, remove, and clear actions
- `git diff --check`
- `python3 scripts/verify.py`

## Open Issues

- None.
