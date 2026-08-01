# Structure

## Top-level Directories

- `src/`: Astro application and TypeScript source.
- `src/client/`: browser controllers, result rendering, and the search worker.
- `src/core/`: framework-independent query, catalog, support-state, runtime, and ranking logic.
- `src/data/`: TOML catalog of official, conventional, and community documentation sources.
- `src/font-faces.css`: reviewed generated face declarations bundled by Astro.
- `src/pages/`: the single search-product entry, ancillary coverage and legal
  notices, and robots and sitemap discovery routes.
- `src/components/` and `src/layouts/`: shared footer and legal-page shell.
- `scripts/`: index adapters, reproducible publication, live verification, and
  generated font maintenance.
- `public/search-index/`: committed manifests, with content-addressed
  bundles under `public/search-index/bundles/`.
- `public/fonts/google/`: pinned WOFF2 subsets and upstream OFL license files.
- `tests/`: unit, integration, Workers-preview, and real-browser tests.
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
- `src/pages/terms.astro` and `src/pages/privacy.astro`: localized ancillary
  legal notices that remain outside the product sitemap.
- `src/components/SiteFooter.astro` and `src/layouts/AncillaryLayout.astro`:
  compact coverage/legal/report navigation and the theme-aware shell every
  ancillary page shares.
- `src/pages/languages.astro`: the catalog's coverage, generated from
  `loadCatalog()` so it cannot claim more than the search resolves.
- `src/middleware.ts`: declares the per-visitor cache policy on rendered HTML
  documents without touching static assets or discovery routes.
- `src/pages/robots.txt.ts` and `src/pages/sitemap.xml.ts`: expose the
  production sitemap and the root page's EN/JA representations without adding
  separate product-entry pages.
- `public/icon.png` and `public/logo_svg.svg`: the header lockup's square
  mark and single-color wordmark.
- `public/ogp.png`, `public/favicon.png`, and `public/apple-touch-icon.png`:
  right-sized brand assets with fixed intrinsic dimensions.
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
- `scripts/update-font-stylesheet.mjs`: validates and refreshes the committed
  font-face stylesheet, WOFF2 binaries, and licenses without changing the
  family or weight contract.
- `wrangler.jsonc`: Cloudflare Workers runtime, route, compatibility, and
  observability policy.

## Runtime Data Flow

1. Astro resolves the initial query, catalog scope, unified EN/JA language, and
   selected sources. Explicit URL state and the saved preference take
   precedence; `Accept-Language` is used only when neither exists. The
   interface language supplies the documentation preference unless `locale:en`
   or `locale:ja` overrides it for the query.
2. Normal interactive submissions are parsed locally, update history and the
   result mount, and do not request another HTML page. Direct, reloaded, shared,
   and no-JavaScript GET query URLs continue to render on the server.
3. If at least one source is selected, the client requests the lightweight
   runtime status manifest and keeps it in the page-lifetime worker; the
   complete provenance manifest stays available for generation and server
   verification. The no-source state makes no index request.
4. The runtime prefers an exact locale and visibly falls back from Japanese to
   the source's English bundle when no Japanese index exists.
5. The worker fetches and caches matching supported bundles, keeps successful
   bundles when one load fails, scans compact tuples, and ranks/diversifies
   matches.
6. The appearance menu immediately left of EN/JA selects Dark, Light, or
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
7. The runtime derives exact language/site facets from all matches; applied
   filters re-search the cached indexes for the selected source subset.
   Result order stays relevance-first by default and can switch in place to
   catalog language name ascending or descending.
8. While the worker is busy, the result region exposes `aria-busy`, a hidden
   status announcement, and a reduced-motion-safe result-card skeleton.
9. The client groups only unambiguous duplicate reference symbols and renders
   every single- or multi-origin result as a non-link title, an adjacent
   Linguist-colored language tag, and compact subordinate source links.
   It shows the first 15 groups and discloses later batches without navigation.
   Repeated source
   qualifications appear once in a small borderless disclosure above results.
   A contextual Top control appears once the search box leaves view, so it is
   reachable while scrolling a fully expanded source list.
   A clear control inside the query field empties it while typing, after
   typing, and after a search, and an empty query restores every source group.
   Filled controls with white labels use the darker `#7951EF` action accent in
   both themes so their labels clear 4.5:1.
   The light interface palette uses `#825CFF` as its theme color and preserves
   the prior perceptual-lightness hierarchy; primary light-theme result text
   remains near-black. Dark mode uses the same purple identity with
   low-luminance purple surfaces and near-white result text.
   The visible heading uses the LangRef Search lockup: a square mark and a
   wordmark declared with fixed dimensions on one flex row. Search and enabled toggle controls use the theme accent.
   A completed search keeps the query focused on pointer-driven devices and
   releases focus on touch devices so the virtual keyboard stops covering the
   results; an empty or invalid query keeps focus for the correction.
10. The client renders original HTTPS links, qualified result titles, actual
   content locales, document kinds, proposal state and warnings,
   locale-fallback notices before the count, partial failures, and explicit
   unsupported states. The visible source-policy control selects official-only,
   per-language fallback, or all-source behavior; automatic fallback does not
   render a notice.
11. The clean top-page EN/JA representations provide localized title,
    description, canonical, `hreflang`, Open Graph, Twitter, favicon, and
    `WebSite` data. Search and filter state URLs canonicalize to the clean
    localized home and remain `noindex,follow`. The top page remains the only
    product entry.
12. A compact footer links ancillary noindex Terms and Privacy pages and the
    external Google Forms report route. The legal pages disclose the operator,
    Cloudflare hosting, local preferences, query fallback, report retention,
    and named AI investigation services.

## Change Rules

- Add source metadata and every locale status in `src/data/docs-sources.toml`.
- Add a verified adapter and generated content-addressed bundle in the same change before declaring `supported`.
- Keep unsupported sources visible as unsupported; never turn a missing bundle into a silent empty result.
- Keep upstream titles, headings, and original URLs only; do not republish complete documentation pages.
- Qualify a title only from reviewed structured ownership data; use prose
  context rather than invented language syntax when ownership is ambiguous.
- Keep browser DOM code in `src/client/` and reusable state/ranking logic in `src/core/`.
- Update source policy, performance numbers, generated artifacts, and tests when an adapter or delivery contract changes.
