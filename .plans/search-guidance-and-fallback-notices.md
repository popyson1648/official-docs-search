# Plan

## Goal

Make search instructions concrete and easy to scan, correct the inaccurate
extension wording, and reduce the visual prominence of per-source fallback
notices while keeping them readable and accessible.

## Scope

- Rename the help action and dialog from generic “Help / 使い方” wording to
  “Search syntax / 検索方法”.
- Replace the dense inline grammar string with one short visible search example.
- Reorganize the dialog into separate syntax rows with one small plain-text
  example directly below every row.
- Replace the inaccurate `.py` extension statement with accurate alias wording
  such as `py` and `ts`, without leading periods.
- Correct the mixed placeholder/concrete multi-language syntax.
- Render each source fallback or index notice on its own line with smaller,
  muted, borderless styling.

## Non-goals

- Change query parsing, ranking, source selection, or index contents.
- Add support for `.py` as a language alias.
- Hide fallback, unavailable, or failed-source information.

## Assumptions

- “検索方法” describes the dialog more accurately than “使い方” because its
  content is limited to search input syntax and examples.
- The compact inline example remains visible near the input; advanced forms
  live in the dialog.
- Examples are unboxed text, while the syntax notation itself may retain its
  existing code treatment.
- Guidance follows the Digital Agency Design System recommendation to provide
  concise, concrete input conditions and examples as support text rather than
  relying on placeholders, and W3C guidance to keep instructions clear, local,
  and example-driven.

## Steps

1. Add localized labels and example strings for the compact hint and search
   syntax dialog.
2. Replace the inline grammar formula with a short localized concrete example.
3. Rebuild the dialog as semantic syntax/example groups, remove periods and
   “extension” wording, and make the multi-language rule fully generic.
4. Change fallback notice rendering from joined text to safe per-message DOM
   lines and apply compact muted styling without a box.
5. Add browser regressions for labels, syntax/example pairing, alias wording,
   absence of the old formula, line breaks, and notice visual hierarchy.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- Desktop and 375 px browser inspection
- `git diff --check`
- `python3 scripts/verify.py`

## Open Issues

- None.
