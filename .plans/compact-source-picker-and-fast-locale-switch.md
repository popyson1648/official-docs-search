# Plan

## Goal

Improve the source and language controls so that Japanese availability is clear,
non-official-source qualifications use an appropriate label, the source picker
is compact and easy to scan, and changing the documentation locale does not
reload the whole page.

## Scope

- Replace the Japanese qualification prefix `ただし、` with `補足：` in the
  source picker and search results while retaining `Note:` in English.
- Change the Japanese locale notice to
  `※ 一部のソースは日本語に未対応です。` and remove the appended
  language/source-name list.
- Mark each source without Japanese content inside the source picker:
  - `日本語未対応` when the UI is Japanese.
  - `No Japanese version` when the UI is English but the requested
    documentation locale is Japanese.
  - Hide the mark when neither the UI nor requested documentation locale is
    Japanese.
- Keep the UI-language switch and help button aligned to the right edge of the
  search header.
- Make the source picker summary, groups, options, metadata, spacing, and
  qualification text more compact without removing information.
- Keep source options in one vertical column at desktop and mobile widths.
- Present source metadata in this order:
  1. source category as a small badge;
  2. a visual divider;
  3. the source domain as an actual external link with an external-link cue.
- Change the documentation-locale control to update the current page in place:
  persist the preference, update the URL and visible control state, rerun the
  search, and update Japanese-availability marks without a document navigation.
- Keep one search worker alive for the page lifetime, cache the manifest and
  already loaded index bundles in that worker, and ignore stale responses from
  rapid repeated locale changes.
- Record the in-page locale-switch and cache-lifetime decision and update current
  performance/testing documentation.
- Refresh generated search-index artifacts for reviewed upstream changes so the
  required live synchronization check passes.

## Non-goals

- Changing the wording of each source's underlying qualification.
- Adding or removing documentation sources manually.
- Changing the existing English `Note:` prefix.
- Adding a service worker, Cache API, or IndexedDB.
- Changing the behavior of query-level `locale:` flags.

## Assumptions

- `補足：` is a natural, softer label for contextual limitations and does not
  imply a contrasting sentence.
- A source is Japanese-capable only when its catalog `site_locales` contains
  `ja`.
- The source-level Japanese-availability mark is relevant when either the UI
  language or the requested documentation locale is Japanese.
- Query-level `locale:` flags continue to take precedence over the locale
  control, matching current server behavior.
- The current measured English-to-Japanese Python switch is the baseline:
  66–167 ms locally and 3,956 ms with 4x CPU throttling, Fast 3G, and browser
  cache disabled.

## Steps

1. Add localized qualification and Japanese-availability labels to the i18n
   layer, then update source-picker and result rendering to use them.
2. Remove the verbose locale-notice source list and place per-source
   Japanese-availability marks in the source picker with client-updatable state.
3. Refactor each source option into accessible checkbox/title content plus a
   separate category badge and safe external domain link.
4. Compact the source picker typography, padding, and spacing, keep its options
   in one vertical column, and pin the header actions to the right at desktop
   and mobile widths.
5. Refactor documentation-locale changes into an in-page update that preserves
   cookies, URL state, source selection, query semantics, and browser history.
6. Reuse a page-lifetime worker and manifest/bundle caches, with request IDs and
   stale-result protection.
7. Add unit, integration, and E2E coverage for text, visibility conditions,
   metadata order/link safety, compact layout, no-navigation switching, URL
   persistence, correct locale results, and fast repeated switching.
8. Refresh and review generated index artifacts affected by current upstream
   changes.
9. Update the architectural decision and project documentation, then run the
   complete repository verification and final UI review.

## Verification

- Run `python3 scripts/verify.py`.
- Run `git diff --check`.
- Verify at 1280 px and 375/390 px widths that:
  - header actions are right-aligned;
  - source options remain readable and keyboard accessible;
  - source options form exactly one column;
  - category appears before the linked domain;
  - Japanese-availability marks follow the UI/docs-locale visibility rules;
  - qualification labels are `Note:` in English and `補足：` in Japanese.
- Verify switching Docs EN → JA:
  - does not replace the current document;
  - updates the URL and preference cookie;
  - updates result and source-availability text;
  - displays Japanese results or the existing explicit English fallback.
- Add a 4x CPU / Fast 3G E2E regression measurement. Target at most 1,500 ms for
  the first uncached locale switch and at most 500 ms for a repeated switch whose
  bundle is already held by the page-lifetime worker.
- Confirm there are no search-time long tasks over 50 ms during the warm switch.
- Use Puppeteer screenshots and DOM/accessibility assertions for final UI
  verification because Chrome DevTools MCP is not configured in this
  environment.

## Open Issues

- Chrome DevTools MCP 1.6.0 is installed and enabled in the Codex configuration.
  The current Codex session started before that server became available, so its
  tools require a new Codex session to appear. Puppeteer remains available for
  behavioral and timing regression checks in this session.
