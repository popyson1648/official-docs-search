# Plan

## Goal

Move Japanese-to-English fallback guidance above the result count, replace the
boxed loading sentence with an accessible result-list loading state, and make
search-result titles identify the actual API, type, module, or document context
instead of repeating ambiguous leaf names such as `sort`.

## Scope

- Render index and locale-fallback guidance before the successful result count.
- Remove the visible “Loading search results…” / “検索結果を読み込んでいます…”
  box while retaining an assistive-technology loading announcement.
- Reserve stable result-list space during loading and render result-card-shaped
  skeletons with a restrained horizontal wave shimmer.
- Center the loading composition vertically in the reserved result area without
  moving the search form or causing a result-layout jump.
- Mark the dynamic result region `aria-busy="true"` during initial, locale, and
  filter searches and reset it for success, empty, and error states.
- Make the skeleton non-interactive and hidden from the accessibility tree.
- Disable shimmer and spinner motion under `prefers-reduced-motion`.
- Audit every supported source/locale bundle for ambiguous repeated titles.
- Prefer canonical qualified identifiers supplied by upstream metadata.
- Add source-family title normalization where an owner is unambiguously encoded
  in structured metadata or a reviewed URL shape. For example:
  - cpprefjp `reference/algorithm/sort.html` becomes `std::sort`;
  - cpprefjp list member pages become names such as `std::list::sort`;
  - Ruby class and instance methods include their class/module owner;
  - ExDoc, Javadoc, Microsoft API, Rustdoc, and similar structured indexes retain
    or construct their documented module/type owner.
- For repeated prose headings where no language-level identifier exists, add a
  concise document or section context instead of inventing a namespace.
- Keep proposal and standard identifiers and titles intact.
- Keep title normalization deterministic and covered by per-adapter fixtures,
  bundle validation, and browser assertions.
- Update generated content-addressed bundles, the manifest, performance numbers,
  project documentation, templates, and decision records when affected.

## Non-goals

- Invent API ownership when neither upstream metadata nor a reviewed URL shape
  proves it.
- Rewrite documentation page titles for style alone.
- Add a frontend framework or loading-component dependency.
- Change exact-first ranking, fuzzy-search thresholds, source fallback, or
  result filtering.
- Use skeletons for search controls, messages, empty states, or errors.

## Assumptions

- “Other languages and sites similarly” means that API-like results should use
  canonical qualified names when trustworthy ownership data exists, while
  ordinary prose documentation should use a contextual title rather than fake
  language syntax.
- The visible loading state should model the result cards that will replace it.
  A small centered activity indicator may sit over the skeleton stack, but the
  skeleton wave is the primary progress cue.
- The loading sentence remains available to screen readers through the existing
  status live region, but is visually hidden only while loading.
- Existing success, empty, and error status text remains visible.

## Research

- Material UI documents skeletons as placeholder previews that improve perceived
  responsiveness and supports a wave animation:
  <https://mui.com/material-ui/react-skeleton/>.
- Carbon recommends skeleton states for structured lists/cards and filter
  changes, using motion to show that the page is not stuck:
  <https://preview.carbondesignsystem.com/building-blocks/core/patterns/loading>.
- Atlassian defines a skeleton as a content placeholder and distinguishes it
  from a spinner:
  <https://atlassian.design/components/skeleton>.
- WAI-ARIA 1.2 defines `aria-busy` for batching dynamic updates until content is
  ready:
  <https://www.w3.org/TR/wai-aria/#aria-busy>.
- Primer keeps loading text available to assistive technology even when a
  spinner is visual-only:
  <https://primer.style/product/components/spinner/>.

## Steps

1. Add focused tests that capture the current notification order, loading DOM,
   accessibility state, motion preference, and ambiguous `cpp sort` titles.
2. Reorder the result shell and renderer so locale fallback details appear
   immediately above the success count while empty and error states remain
   coherent.
3. Add a stable loading-region component with result-card skeleton markup,
   centered visual activity, `aria-busy`, and screen-reader-only status text.
4. Add wave-shimmer styling using existing color tokens, mobile-safe dimensions,
   no focusable descendants, and a static reduced-motion state.
5. Inventory duplicate and leaf-only titles across all supported source/locale
   bundles and group fixes by adapter/source family.
6. Implement explicit canonical title rules for structured API sources,
   beginning with cpprefjp and the high-duplication Ruby, ExDoc, Sphinx,
   Javadoc, Rustdoc, Microsoft, and language-package adapters.
7. Add a conservative contextual fallback for repeated prose headings that
   cannot be represented as language identifiers.
8. Regenerate only affected source bundles unless a shared record-format change
   makes broader regeneration necessary; review count and size gates.
9. Verify representative qualified titles for C++, Ruby, Python, JavaScript,
   Java, Rust, Elixir, Go, and documentation-style sources in unit, integration,
   and browser tests.
10. Update current project docs, templates, decisions, and performance numbers,
    run repository verification, visually inspect desktop/mobile/reduced-motion
    loading states, then perform final regression and maintainability review.

## Verification

- `python3 scripts/verify.py`
- `npm run test:integration`
- Source-scoped search-index generation/checks for every changed adapter family.
- `cpp sort` shows `std::sort`, `std::ranges::sort`,
  `std::list::sort`, or similarly qualified titles instead of several bare
  `sort` headings.
- Representative API results in other languages include verified owner context.
- Repeated prose headings include document/section context without fake
  namespaces.
- The Japanese locale-fallback summary is above the visible result count.
- Loading shows no visible boxed sentence, reserves result space, and displays
  a wave skeleton at desktop and 390-by-800 mobile sizes.
- The result region is busy only while data is loading; the loading announcement
  remains available to assistive technology.
- Reduced-motion mode has no shimmer or spinner animation.
- Initial, Docs-locale, and result-filter searches all enter and leave the same
  loading state without stale skeletons or layout jumps.

## Open Issues

- Some high-duplication indexes contain repeated changelog or generated
  documentation headings whose section and fragment are also repeated. Those
  entries can be contextualized only to the strongest trustworthy document
  scope and may still share a visible title when upstream exposes no further
  distinction.
- A shared compact-record schema change would require every bundle, including
  slow GNU sources, to be regenerated and verified. Prefer adapter-level title
  correction unless a separate display-title field proves necessary.
- Showing both a spinner and skeleton can be visually redundant. The initial
  implementation will keep any centered indicator subtle and treat the
  result-card wave as the primary loading cue.
