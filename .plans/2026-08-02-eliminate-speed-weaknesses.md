# Plan

## Goal

Eliminate the measured first-load and cold-search bottlenecks without weakening
the privacy policy, no-JavaScript fallback, search correctness, accessibility,
or the already-fast in-page search path.

Success means that the production build:

- transfers direct-query HTML in at most 25 KiB with gzip instead of about
  164 KiB uncompressed, while retaining `private, no-cache, no-transform`;
- has no render-blocking font-face catalog and materially reduces the initial
  render-blocking CSS transfer from the measured roughly 42 KiB;
- no longer ships Astro `ClientRouter` or waits for it before initializing the
  search client;
- starts the runtime manifest and eligible initial search bundles from HTML
  resource hints, before the worker's serial discovery path;
- keeps warm same-scope searches free of document and index requests; and
- protects these properties with automated contract, bundle, and browser tests.

## Scope

- Add privacy-preserving, negotiated HTML gzip in the Cloudflare middleware.
- Split page CSS from generated font-face CSS and load only the required font
  families outside the render-blocking path, retaining the metric-matched
  fallback and a no-JavaScript stylesheet fallback.
- Remove the obsolete `ClientRouter` dependency and transition annotations now
  that searches and language changes are handled entirely in page JavaScript.
- Add high-priority image preload metadata and an explicit cache policy for the
  stable visible brand assets.
- Share search-manifest entry selection between the server and search runtime,
  expose deterministic compressed-size metadata, and emit budgeted preload
  hints for a direct query's exact initial bundles.
- Add regression budgets and tests for compression negotiation, response
  identity, privacy headers, resource hints, initial asset composition, request
  behavior, accessibility, layout, and search-result equivalence.
- Record the delivery decision and update current project performance, build,
  testing, and verification documentation.

## Non-goals

- Do not remove or weaken `no-transform`, enable automatic Web Analytics, add a
  third-party script, or change the published privacy promise.
- Do not remove the self-hosted brand fonts, alter the visual design, change
  ranking, or reduce the supported source catalog.
- Do not add a service worker, IndexedDB cache, or speculative preloads for a
  page that has no query.
- Do not merge or deploy. Production remeasurement follows a separately
  approved deployment.

## Assumptions

- Cloudflare Workers automatically streams the encoding named by
  `Content-Encoding`; `ResponseInit.encodeBody = "manual"` is reserved for an
  already-compressed body. This was checked against the current official
  runtime documentation and the direct workerd response.
- Direct-query bundle hints may include only bundles the page has already
  resolved and will request. A cumulative compressed-size cap prevents the
  hints from competing with first paint on unusually broad queries.
- The existing metric-matched fallback keeps font swapping within the current
  CLS budget while font-face declarations load asynchronously.
- Removing `ClientRouter` is safe because accepted decision
  `2026-07-30-run-interactive-search-without-page-fetches` replaced HTML swaps
  with local state updates; ordinary links and the GET fallback remain normal
  document navigations.

## Steps

1. Add a response helper that parses `Accept-Encoding` quality values, requests
   Workers' automatic streaming gzip for eligible HTML, removes an obsolete
   `Content-Length`, sets `Content-Encoding: gzip`, and merges
   `Vary: Accept-Encoding`. Preserve status, status text, cookies,
   locale/cookie variance, cache directives, identity fallback, HEAD behavior,
   and the absence of an injected analytics beacon.
2. Split the generated font stylesheet by family. Inline the compact structural
   and page CSS into the compressed document, load Alexandria and LINE Seed JP
   font-face catalogs asynchronously only when the current UI/result locale
   needs them, and provide a no-JavaScript fallback. Update the font generator
   so the split outputs are reproducible rather than hand-maintained.
3. Remove `ClientRouter`, Astro transition metadata, and the synthetic
   `astro:page-load` lifecycle dependency. Initialize the client module directly
   at the end of the document and replace test synchronization with an
   application-owned search-state signal.
4. Add `fetchpriority="high"` to the visible-logo preload hints and a bounded
   browser-cache policy for the visible logo files so repeat visits avoid
   revalidation without creating year-long stale unversioned assets.
5. Export and test the pure manifest-entry selection logic used by the worker.
   Include deterministic gzip/Brotli sizes in the runtime manifest, import that
   generated manifest into the server build, and emit `crossorigin` fetch
   preloads for the manifest and the exact initial supported bundles when a
   valid direct query is present. Apply count and cumulative Brotli-size caps;
   emit no bundle hints for an empty/invalid query.
6. Add server contract tests that gunzip the response and compare it byte-for-byte
   with identity output, exercise encoding negotiation and `Vary` merging, and
   assert the privacy/cache headers and no-beacon contract. Add unit tests for
   entry selection and preload budgeting, build-asset budgets that reject the
   router or an oversized critical stylesheet, and E2E assertions for direct
   query preloads, zero-request warm searches, result parity, layout, and
   accessibility.
7. Add a decision record for application-negotiated HTML compression and bounded cold-search
   hints. Update `.project/` and verification path selection so the documented
   architecture, commands, budgets, and CI coverage match the implementation.
8. Run focused checks during implementation, then `python3 scripts/verify.py`.
   Review the diff and built artifacts, run five cold mobile and five cold
   desktop Lighthouse passes plus a Fast 3G/4x CPU cold-and-warm browser trace,
   and compare medians and request order with the 2026-08-02 production baseline.

## Verification

- `npm run typecheck`
- focused Vitest tests for compression, manifest selection, and generation
- `npm run test:server`
- `npm run test:e2e:performance`
- layout/search E2E coverage selected by `.project/verification.toml`
- `npm run check:worker`
- `python3 scripts/verify.py`
- production-build response inspection for identity and gzip clients
- five-run mobile and desktop Lighthouse medians
- Fast 3G, 4x CPU cold direct-query and ten-run warm same-scope trace
- manual 390 px and 1280 px visual/accessibility inspection in light and dark
  modes, including Japanese UI and no-JavaScript fallback

## Open Issues

- The live site cannot demonstrate the improvements until a deployment is
  separately approved. This task stops with a verified branch and an explicit
  before/after report.

## Outcome

- Completed on branch `perf/eliminate-speed-weaknesses` on 2026-08-02.
- The production build's direct-query HTML is 24,519 bytes over gzip, cold
  mobile Lighthouse LCP median is 1,661 ms, and desktop LCP median is 451 ms.
- Direct cold search completed in 2,514 ms under Fast 3G with 4x CPU slowdown;
  ten warm same-scope searches had a 38 ms median and made no document or index
  requests.
- Five mobile and five desktop Lighthouse runs scored 100 for Performance,
  Accessibility, and Best Practices. The indexable home page also scored 100
  for SEO; query pages intentionally remain `noindex,follow`.
- Font swapping remained below the CLS budget, search bundle preload reuse was
  confirmed, and all repository verification phases plus the Worker dry-run
  and startup check passed.
- The committed search indexes were refreshed after the live synchronization
  phase detected normal upstream documentation changes; 90 live result URLs
  were then verified successfully.
