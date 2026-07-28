# Plan

## Goal

Use one visible EN/JA control for both interface language and the preferred
documentation language, while retaining explicit `locale:` query overrides
and keeping the mobile "Non-official sources" setting inside the viewport.

## Scope

- The top-right site-language control and documentation-locale resolution.
- English fallback for sources without a Japanese index and its existing
  consolidated notice.
- Compatibility behavior for old `docsLocale` URLs and preferences.
- The mobile layout of the non-official-source setting at 320–390 px.
- Unit, integration, and browser coverage for the new language model.

## Non-goals

- Renaming the non-official-source setting or its choices.
- Redesigning the source-policy segmented control.
- Changing source-policy behavior.
- Adding automatic fallback when a Japanese index exists but a particular
  query has no Japanese match.

## Assumptions

- The label and control should remain side by side whenever their actual
  localized widths fit.
- When they cannot fit, wrapping the complete label and complete control onto
  separate rows is preferable to clipping, tiny text, or wrapping button text.
- UI language is the default documentation preference.
- An explicit `locale:en` or `locale:ja` query is intentional and wins over the
  UI language.
- Existing shared URLs should degrade predictably rather than silently keeping
  an invisible, permanent independent preference.

## Steps

1. Remove the visible Docs locale row and make EN/JA update both the interface
   and the effective documentation locale.
2. Keep `locale:en` and `locale:ja` as explicit query-level overrides.
3. Migrate old `docsLocale` URLs to the unified locale behavior and stop using
   the independent Docs-locale cookie.
4. Preserve the current per-source English fallback and consolidated notice
   when Japanese documentation is unavailable.
5. Move Docs-locale intent prefetching to the unified language control while
   retaining page-lifetime worker/index reuse.
6. Replace the mobile two-column intrinsic grid for the source-policy row with a
   right-aligned wrapping layout.
7. Preserve the current label, button sizing, order, colors, and interaction.
8. Add E2E coverage at 320, 375, and 390 px for viewport containment, and
   confirm that localization determines whether wrapping is needed.
9. Run type checking, focused browser tests, and the repository
   verification selected for the changed paths.

## Verification

- No visible Docs locale control remains.
- Switching EN/JA updates results without a document navigation.
- `locale:` overrides remain stable while the interface language changes.
- Japanese searches use English only for sources without Japanese indexes and
  show the existing notice above the result count.
- Old independent Docs-locale state cannot remain as a hidden sticky setting.
- No element in the setting has a negative left edge or exceeds the viewport.
- English wraps as needed; Japanese remains side by side where it fits.
- No document-level horizontal overflow.
- All source-policy controls remain keyboard accessible and unchanged
  semantically.

## Open Issues

- None.
