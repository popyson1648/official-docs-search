# Plan

## Goal

Remove repeated Japanese-to-English fallback sentences and prevent the generic
Japanese-availability notice from duplicating result-specific information.

## Scope

- Group all sources sharing the same JA-to-EN fallback into one concise status
  sentence followed by a semantic source list.
- Keep the grouped status adjacent to the search results it describes.
- Show the generic “some sources do not support Japanese” notice only before a
  search, never alongside result-specific fallback details.
- Preserve per-source “日本語未対応” labels inside Sources.
- Keep unavailable-index and failed-index messages distinct from locale
  fallbacks.

## Non-goals

- Hide which sources are using English results.
- Change locale selection, fallback behavior, source selection, or ranking.
- Turn the fallback into a prominent warning or notification banner.

## Assumptions

- Recommended Japanese copy:
  `次のソースは日本語版がないため、英語の検索結果を表示しています。`
- Source names appear below that sentence in a semantic list without repeating
  the explanation.
- The generic notice still helps before a query when no result-specific status
  exists, but has no unique value after results are present.
- The result status remains a polite live-region update and uses the existing
  compact muted visual treatment.

## Steps

1. Add localized grouped-fallback summary text to the message catalog.
2. Render fallback sources as one labeled group with a semantic list, using safe
   DOM text APIs.
3. Keep other coverage and load-failure messages in their existing separate
   lines.
4. Suppress the generic Japanese-availability notice whenever a query is
   active, including after in-page Docs-locale changes.
5. Add browser regressions for grouped copy, source-list semantics, absence of
   repeated sentences, generic/result notice mutual exclusion, UI locale
   switching, and desktop/mobile layout.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- Desktop and 375 px browser inspection
- `git diff --check`
- `python3 scripts/verify.py`

## Open Issues

- None.
