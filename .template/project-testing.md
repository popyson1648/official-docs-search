# Testing

## Test Types

- `npm test` verifies query, catalog, client controls, highlighting, adapters, deterministic publication, compact bundles, runtime loading, ranking, and diversification.
- `npm run test:integration` verifies all supported indexes, catalog/manifest agreement, counts, hashes, URL scope, per-bundle and selected-set budgets, every known query, and multi-language results.
- `npm run test:server` verifies production SSR, gzip/Brotli, validators, conditional responses, and cache policies.
- `npm run test:e2e` drives Chromium against the production server and real committed bundles.
- Concern-specific E2E commands verify filters, catalog coverage,
  layout/accessibility, and performance against one existing build.
- `npm run test:live:affected` checks only source families affected by the
  current diff.
- `npm run test:live` explicitly checks all upstream artifacts and live links.

## Minimum Checks Before Completion

Run `python3 scripts/verify.py`.
The default mode combines unpushed commits with working-tree and untracked
changes, then runs only applicable pre-push phases.
Documentation-only changes run no Node command, while unknown implementation
paths and newly added implementation/configuration paths fall back to all
offline phases.
Use `python3 scripts/verify.py --mode ci --full` for complete deterministic
offline verification.
Use `python3 scripts/verify.py --mode all --full --include-network` only for an
explicit all-source live check.

## Checks By Change Type

- Update focused unit tests for parser, source-resolution, runtime, and client changes.
- Update generator tests, integration thresholds, and intentional artifacts for adapter changes.
- Update server-contract tests for compression or caching changes.
- Update browser flows for user-facing behavior changes.
- Run affected live verification after reviewing an intentional source-scoped
  upstream-data refresh.

## Required Browser Coverage

Assert one non-empty original result for every catalog language and supported
exact locale.
Fix the approved language/index/locale counts and cover every language-level
requested-locale fallback, source toggles and preservation, HTTP and malformed
bundle partial failures, visible edition qualifications, support states,
escaping, safe new-tab behavior, and desktop/mobile visibility.
For admitted non-official teaching sources, require official-only exclusion,
a known `source:all` result, and localized source-picker/result qualifications.
Verify per-source Japanese-availability labels, source metadata order, a
single-column source picker, compact desktop/mobile controls, and right-aligned
header actions.
Fix title centering and right-aligned EN/JA independently of translation width.
Place a 44 CSS-pixel, labelled Search syntax dialog trigger after the visible
Search submit button. Verify localized hover/keyboard-focus tooltip text, dialog
focus return, query usability, and no page overflow down to 320 CSS pixels.
For mobile settings, verify a shared control edge, separate descriptive text and
control hit targets, and accessible naming.
Record narrow header edge alignment and the maximum allowed gap between compact
setting labels and their controls.
When browser tests replace worker-fetched responses, define how interception is
made deterministic while retaining separate production-worker coverage.
For multi-language forms, accept whitespace after commas, add defaults only for
newly introduced languages, and preserve checked disabled non-official Sources.
Fix one title/tag/source-link structure across single- and multi-origin results,
user-facing language names, exact language-color use, black/white contrast
selection, marker ownership, shared source-kind styling, typography hierarchy,
removable input-chip target size and keyboard behavior, compact successful
result counts, 24 CSS-pixel source-control targets, and visible keyboard focus
for Docs-locale controls.
Conservatively group qualified reference symbols only across distinct origins,
preserve every source link, keep ambiguous/proposal records separate, show 15
groups initially, and test localized incremental disclosure without navigation.
Show repeated source qualifications once in a source-level details section.
Require locale-fallback details before the count and test result-card loading
skeletons, vertically centered progress, `aria-busy`, hidden assistive loading
text, cleanup after completion, and reduced-motion suppression.
Require representative qualified API titles for every structured adapter family
and conservative context for ambiguous prose without invented namespaces.
Require concrete unboxed examples for every search-syntax row, accurate alias
wording, a persistent short `js promise all` example, one multi-token AND
explanation in search help, and one compact fallback explanation with a
semantic source list instead of repeated sentences.
Require exact full-match language/site facets, OR-within and AND-across
selection, cached in-page re-search, any supported stable result ordering
without unnecessary index fetches, one removable applied pill per facet,
clear-all behavior, and current counts and notices. Match the approved
reference interaction for overlay opening without result reflow, persistent
panel state during property and choice changes, outside-pointer dismissal,
Escape and Back focus restoration, active-trigger state, localized
accessibility, width-morph timings, mobile containment, coarse-pointer targets,
and reduced-motion suppression. Define whether the filter trigger uses a visible
label or compact icon-only shape, retain a localized accessible name, and
distinguish choice-panel geometry from text-search surface geometry.
Require grouped origins to remain subordinate to one dominant title, avoid
nested card borders and repeated top-level dividers, and keep source
qualifications in a smaller borderless disclosure.
For long pages, verify any contextual Top control's threshold, fixed placement,
focus destination, localization, target size, and reduced-motion behavior.
Do not show a generic Japanese-availability notice before searching; retain
result-specific fallback details and per-source availability labels.
Require regression coverage for common-symbol completeness, conservative typo
recovery, exact-first reference-over-proposal ranking, official proposal
identifiers, silent per-language automatic fallback and explicit overrides, bounded
accessible suggestions (keyboard, pointer, Escape, and IME), and one shared
no-source/no-result status component.
The no-source path must not fetch the manifest.
Under constrained network and CPU conditions, budget the first in-page
Docs-locale switch separately from a repeated worker-cached switch and require
no new document request or warm-switch Long Task over 50 ms.

## Generation Safety Coverage

Require deterministic identical-input output and manifest order, duplicate-job
rejection, no partial publication, non-mutating check mode,
corrupt/timeout/error rejection, explicit approval for large changes, and plain
text normalization for Sphinx title and section metadata.
