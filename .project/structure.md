# Structure

## Top-level Directories

- `src/`: Astro application and TypeScript source.
- `src/client/`: browser controllers, result rendering, and the search worker.
- `src/core/`: framework-independent query, catalog, support-state, runtime, and ranking logic.
- `src/data/`: TOML catalog of official, conventional, and community documentation sources.
- `src/font-faces.css`: reviewed generated face declarations bundled by Astro.
- `src/pages/`: the single search-page entry plus robots and sitemap discovery
  routes.
- `scripts/`: index adapters, reproducible publication, live verification, and production serving.
- `public/search-index/`: committed compact search bundles and manifest.
- `tests/`: unit, integration, production-server, and real-browser tests.
- `.plans/` and `.decisions/`: approved task plans and architecture history.

## Important Modules

- `src/core/query.ts`: parses language, source, and locale query syntax.
- `src/core/sources.ts`: loads the canonical catalog, resolves scope and support states, and validates result URLs.
- `src/core/search.ts`: validates bundle identity, caches normalized compact
  records, applies exact-first bounded typo tolerance, ranks document kinds and
  lifecycle states, and diversifies languages.
- `src/core/search-runtime.ts`: fetches and validates manifest-selected bundles and isolates unavailable, failed, or malformed sources.
- `src/core/result-filters.ts`: resolves language and source facet selections with OR-within and AND-across semantics.
- `src/core/result-groups.ts`: conservatively groups equivalent qualified
  reference symbols and stably orders groups by catalog language name when
  requested.
- `src/core/language-colors.ts`: pins the GitHub Linguist display palette
  separately from index-affecting source metadata and derives black or white
  tag text from perceived sRGB brightness.
- `src/core/highlight.ts` and `src/core/search-controls.ts`: pure query-highlight and preference/selection helpers.
- `src/core/theme.ts`: validates Light, Dark, and System appearance settings and
  serializes the server-readable theme preference.
- `src/client/search-controls.ts`: binds query, debounced accessible
  suggestions, IME handling, in-page locale, automatic fallback, source,
  cookie, URL, tag, and help controls.
- `src/client/search-results.ts`: reuses the page-lifetime worker for results
  and suggestions, rejects stale responses, and renders external strings with
  DOM text APIs, safe links, and glyph-independent SVG external-link marks.
- `src/client/search-result-filters.ts`: renders compact accessible
  language/site/order filters, a pill toolbar, a rounded-rectangle horizontal
  choice panel, language-colored Language choices, and theme-tinted generic
  and applied-filter controls.
- `src/client/back-to-top.ts`: reveals the contextual Top control after the
  search panel leaves view and returns focus to the page heading.
- `src/client/theme-menu.ts`: manages the accessible appearance menu, cookie
  persistence, metadata, and live operating-system color-scheme changes.
- `src/client/search-page.ts`: small browser initialization entry point.
- `src/client/search.worker.ts`: parses and searches selected indexes off the main thread.
- `src/pages/index.astro`: server-rendered search form, localized brand and
  discovery metadata, split-color query language chips, and the result shell.
- `src/pages/robots.txt.ts` and `src/pages/sitemap.xml.ts`: expose the
  production sitemap and the root page's EN/JA representations without adding
  separate product-entry pages.
- `public/logo.png`, `public/ogp.png`, `public/favicon.png`, and
  `public/apple-touch-icon.png`: right-sized brand assets with fixed intrinsic
  dimensions.
- `scripts/search-index.mjs`: shared DevDocs, Sphinx, Ecmarkup, Javadoc, and HTML normalization helpers.
- `scripts/search-index/`: source-family job registries, parser modules, and job helpers.
- `scripts/search-index/title-qualification.mjs`: preserves canonical qualified
  API ownership and adds conservative context to repeated prose titles.
- `scripts/search-index/change-scope.mjs`: maps changed source-family paths to
  the smallest safe live-index scope.
- `scripts/generate-search-index.mjs`: the composed job registry and update/check CLI.
- `scripts/search-index-generator.mjs`: deterministic full/partial validation,
  verified artifact reuse, manifest construction, staging, and manifest-last
  publication.
- `scripts/verify-live-search-index.mjs`: verifies known live result URLs for
  an explicit source or cadence selection.
- `scripts/verify-affected-search-index.mjs`: composes affected generation and
  live-link checks.
- `scripts/verify.py`: selects repository verification phases from changed
  paths with conservative fallback.
- `scripts/precompress-production-assets.mjs`: creates maximum-compression
  search-index sidecars inside the production build output.
- `scripts/update-font-stylesheet.mjs`: validates and refreshes the committed
  font-face stylesheet without changing the family or weight contract.
- `scripts/serve-production.mjs`: serves Astro middleware with whole-response
  text compression, precompressed search-index delivery, and the search-asset
  cache contract.

## Runtime Data Flow

1. Astro resolves the initial query, catalog scope, unified EN/JA language, and
   selected sources. Explicit URL state and the saved preference take
   precedence; `Accept-Language` is used only when neither exists. The
   interface language supplies the documentation preference unless `locale:en`
   or `locale:ja` overrides it for the query.
2. If at least one source is selected, the client requests the lightweight
   runtime status manifest and keeps it in the page-lifetime worker; the
   complete provenance manifest stays available for generation and server
   verification. The no-source state makes no index request.
3. The runtime prefers an exact locale and visibly falls back from Japanese to
   the source's English bundle when no Japanese index exists.
4. The worker fetches and caches matching supported bundles, keeps successful
   bundles when one load fails, scans compact tuples, and ranks/diversifies
   matches.
5. The appearance menu immediately left of EN/JA selects Dark, Light, or
   System. The saved cookie lets SSR emit the correct root setting before CSS;
   System follows `prefers-color-scheme` without reloading. The menu supports
   radio-menu semantics, arrows, Home, End, Escape, outside dismissal, and
   focus restoration. A top-right EN/JA change updates the interface, URL, preference,
   availability labels, and results without replacing the current document.
   Legacy independent Docs-locale state is migrated once and removed.
   The source-policy description remains non-interactive text associated with
   its control. On mobile the right-aligned row stays horizontal when its
   localized contents fit and wraps complete items when they do not.
   Inside the source picker, a derived proposal-document toggle selects every
   visible `proposal` source. It is on when at least one proposal source is
   selected and off when none are selected. Individual `sourceId` values remain
   the submitted and persisted state.
6. The runtime derives exact language/site facets from all matches; applied
   filters re-search the cached indexes for the selected source subset.
   Result order stays relevance-first by default and can switch in place to
   catalog language name ascending or descending.
7. While the worker is busy, the result region exposes `aria-busy`, a hidden
   status announcement, and a reduced-motion-safe result-card skeleton.
8. The client groups only unambiguous duplicate reference symbols and renders
   every single- or multi-origin result as a non-link title, an adjacent
   Linguist-colored language tag, and compact subordinate source links.
   It shows the first 15 groups and discloses later batches without navigation.
   Repeated source
   qualifications appear once in a small borderless disclosure above results.
   A contextual Top control appears only after the search panel leaves view.
   The light interface palette uses `#825CFF` as its theme color and preserves
   the prior perceptual-lightness hierarchy; primary light-theme result text
   remains near-black. Dark mode uses the same purple identity with
   low-luminance purple surfaces and near-white result text.
   The visible heading uses the optimized LangRef Search logo with fixed
   dimensions. Search and enabled toggle controls use the theme accent.
9. The client renders original HTTPS links, qualified result titles, actual
   content locales, document kinds, proposal state and warnings,
   locale-fallback notices before the count, partial failures, and explicit
   unsupported states. The visible source-policy control selects official-only,
   per-language fallback, or all-source behavior; automatic fallback does not
   render a notice.
10. The clean top-page EN/JA representations provide localized title,
    description, canonical, `hreflang`, Open Graph, Twitter, favicon, and
    `WebSite` data. Search and filter state URLs canonicalize to the clean
    localized home and remain `noindex,follow`. The top page remains the only
    product entry.

## Change Rules

- Add source metadata and every locale status in `src/data/docs-sources.toml`.
- Add a verified adapter and generated content-addressed bundle in the same change before declaring `supported`.
- Keep unsupported sources visible as unsupported; never turn a missing bundle into a silent empty result.
- Keep upstream titles, headings, and original URLs only; do not republish complete documentation pages.
- Qualify a title only from reviewed structured ownership data; use prose
  context rather than invented language syntax when ownership is ambiguous.
- Keep browser DOM code in `src/client/` and reusable state/ranking logic in `src/core/`.
- Update source policy, performance numbers, generated artifacts, and tests when an adapter or delivery contract changes.
