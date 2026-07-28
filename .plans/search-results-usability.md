# Plan

## Goal

Make long search-result sets easier to scan and operate while preserving source
choice, ranking truthfulness, and accessibility.

## Scope

- Group only unambiguous duplicate reference symbols from different sources.
- Show result groups in batches of 15 with a localized Load more control.
- Move repeated source qualifications into one compact source-level section.
- Use catalog language names instead of internal IDs in result badges.
- Localize Japanese page, source-picker, query-input, and removal labels.
- Make the result-filter trigger explicit and at least 44 by 44 CSS pixels.
- Remove the generic Japanese-availability notice shown before searching.
- Update tests, current-state documentation, templates, and decision history.

## Non-goals

- Merge similarly named but distinct APIs, prose pages, specifications, or
  proposal revisions.
- Change search scoring, fuzzy matching, source admission, or locale fallback.
- Add server-side pagination or alter result URLs.
- Translate the intentional `Docs` product label in this task.

## Assumptions

- A reference is groupable only when its normalized title has a technical
  qualifier such as `::`, `.`, `#`, or `()`.
- Records from the same source and locale never merge solely because their
  titles match.
- The first ranked record supplies group order and the displayed canonical
  title; every source remains a separate, visible link.
- Fifteen compact groups are approximately three to four mobile viewports and
  are a suitable initial batch.
- Result-specific fallback details and per-source Japanese-availability labels
  are sufficient; the generic pre-search notice adds no actionable information.

## Steps

1. Add a pure conservative grouping helper and unit coverage.
2. Render grouped source choices while preserving standalone-result rendering
   for ambiguous and non-reference records.
3. Add 15-item incremental rendering with total count, localized progress, and
   keyboard-safe completion behavior.
4. Collect repeated source qualifications into one localized details section.
5. Replace internal language IDs and incomplete Japanese labels with catalog
   names and localized accessible copy.
6. Enlarge and label the filter trigger, then remove the pre-search locale
   notice and its obsolete controller logic.
7. Extend responsive E2E coverage for grouping, source links, load more,
   filtering, localization, target size, and notices.
8. Run focused and full verification, inspect desktop/mobile UI, commit, push
   to `dev`, and monitor CI.

## Verification

- `std::sort` from different reference sites appears once with separate source
  links.
- Case-distinct identifiers such as `pkg.Foo` and `pkg.foo` remain separate.
- Unicode-distinct identifiers such as `pkg.K` and `pkg.Ｋ` remain separate.
- `std::ranges::sort`, `std::list::sort`, proposals, and ambiguous prose remain
  independent results.
- At most 15 result groups render initially; Load more appends the next batch
  without navigation and reports progress.
- Filtering resets the visible batch and groups only the filtered records.
- Each visible source remains reachable, safely opens in a new tab, and retains
  locale and source-kind context.
- Repeated source qualifications appear once per source outside result items.
- Japanese UI shows `ソース`, `C++`, localized page title, localized input name,
  and localized removal controls.
- The filter trigger has visible localized text and a 44 CSS-pixel target.
- No generic Japanese-availability notice appears before searching, while
  result-specific fallbacks and source-level availability remain.
- 320, 375, 390, 641, and 1280 CSS-pixel layouts do not overflow.
- `python3 scripts/verify.py` and GitHub Actions pass.

## Open Issues

None.
