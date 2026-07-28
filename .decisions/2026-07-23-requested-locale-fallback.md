# Decision

## Title

Keep requested documentation locale separate from actual content locale

## Date

2026-07-23

## Status

Accepted; the requested-versus-actual content-locale model remains active.
The separate visible UI/Docs preference relationship was superseded by
`2026-07-28-unified-interface-and-document-language.md`.

## Decision

Treat the Docs-locale control as a preference for documentation content, not as
permission to relabel content.

When a request selects Japanese:

1. Search supported Japanese indexes for each selected source when they exist.
2. Otherwise search that source's supported English index.
3. Keep fallback records labeled `en` and show a localized notice that English
   results are being used because a maintained Japanese index is unavailable.

When a request selects English, search only supported English indexes.
When no Docs locale is selected, preserve the existing behavior of searching
all supported actual locales for the selected sources.

Keep `site_locales`, index `docsLocale`, and result `docsLocale` limited to the
actual upstream documentation locale.
Do not generate a duplicate `ja` bundle from English records.
Model fallback as runtime selection and coverage metadata rather than as a fake
catalog locale.

Prefer exact-locale results over fallback results.
If one selected bundle fails to load, return successful results from the other
bundles and report the failed source explicitly.

## Context

The catalog contains many programming languages whose maintained official
documentation exists only in English.
The product must remain useful when a user keeps the Docs-locale preference on
Japanese, but the existing catalog contract correctly defines locales as actual
documentation-site locales.

Adding `ja` to every source would make the catalog and result labels false.
Returning no result for every English-only language would make Japanese locale
selection unnecessarily disable most of the catalog.

## Alternatives

- Declare every English index as both `en` and `ja`: rejected because the
  generated Japanese bundle and result label would be false.
- Return no results for English-only sources under a Japanese request: rejected
  because locale preference should not hide otherwise useful official
  documentation when a truthful fallback is possible.
- Machine-translate index titles: rejected because it creates a derived
  translation product with quality, maintenance, and attribution obligations.
- Combine UI language and Docs locale: rejected because application copy and
  documentation language are independent user choices.

## Reason

Separating requested locale from content locale preserves accurate provenance
and labels while making all supported languages usable under both Docs-locale
preferences.
Exact Japanese content remains preferred and English fallback remains visible.

## Consequences

- The runtime resolves an actual source-locale entry for each requested source.
- Search results continue to expose the actual `docsLocale`.
- Coverage output distinguishes unavailable indexes, English fallback, and
  bundle-load failures.
- Tests must cover exact Japanese selection, Japanese-to-English fallback,
  English-only selection, no-locale selection, and partial success.
- The manifest schema does not need a fake requested-locale entry.
- A future locale beyond English and Japanese requires an explicit fallback
  policy before it is enabled.

## Revisit Conditions

- Maintained Japanese documentation becomes available for an English fallback
  source.
- The product adds more Docs-locale choices.
- Users need a strict mode that forbids fallback.
- Search moves to a server that can negotiate locale dynamically.
