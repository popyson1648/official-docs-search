# Plan

## Goal

Keep source selections correct when a query gains additional programming
languages, preserve disabled non-official selections across form submissions,
and accept whitespace after commas in bare multi-language prefixes.

## Scope

- Parse `rust, ts query` like `rust,ts query`.
- Enable each newly added language's default official sources.
- Preserve checked non-official sources while the non-official toggle is off so
  enabling it restores the Sources controls.
- Cover direct queries, form submissions, toggle navigation, tag removal, and
  desktop/mobile browser behavior.

## Non-goals

- Change source-kind policy, default source definitions, ranking, or index
  contents.
- Accept arbitrary flags in the middle of search text.
- Redesign the Sources component.

## Assumptions

- A user's manual source choices remain authoritative for languages that were
  already visible when the form was submitted.
- Sources belonging to a newly added language start from that language's
  `default_enabled` catalog values.
- Disabled checked controls must be submitted through hidden preservation
  fields because browsers omit disabled controls from form data.

## Steps

1. Extend the bare-language prefix parser to consume comma-separated language
   aliases across whitespace and keep one flag range for highlighting.
2. Extend language-tag removal to handle both compact and spaced comma lists.
3. Submit the canonical language scope represented by the current Sources
   controls and merge default sources only for languages newly introduced by
   the next query.
4. Render preservation inputs for checked disabled non-official sources and
   keep the existing toggle-time preservation behavior.
5. Add unit and production-browser regressions for spaced language lists,
   second-language official defaults, non-official restoration, manual source
   choices, and tag removal.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `git diff --check`
- `python3 scripts/verify.py`

## Open Issues

- None.
