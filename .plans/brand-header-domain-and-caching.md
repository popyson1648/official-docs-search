# Plan

## Goal

Replace the combined header logo with a two-part brand lockup, move the service
to `langref-search.popyson.com`, make the session KV binding explicit, and serve
content-addressed search bundles with immutable caching.

## Scope

- Replace `public/logo.png` with `public/icon.png` (left mark) and
  `public/logo_svg.svg` (right wordmark) in the search page and legal pages.
- Keep the rendered lockup size, alignment, and accessible name unchanged.
- Move the production origin to `langref-search.popyson.com` in configuration,
  server-rendered metadata, tests, and project documentation.
- Detach the previous custom domain after the new one serves production.
- Pin the adapter-provisioned session KV namespace in Wrangler configuration.
- Serve content-addressed bundles from `public/search-index/bundles/` with a
  one-year immutable `Cache-Control`, keeping both manifests revalidated.

## Non-goals

- Changing the favicon, Apple touch icon, or social image.
- Redirecting the previous domain.
- Adopting Astro sessions or storing server-side user state.
- Regenerating upstream search data or changing bundle contents.

## Assumptions

- `.tmp/icon.png` (3868x3868) and `.tmp/logo_svg.svg` (single-color wordmark,
  ink box 1788x210) are the approved brand sources.
- `popyson.com` is the operator's Cloudflare zone, so a custom domain creates
  its DNS record automatically.
- `@astrojs/cloudflare` always injects the KV session driver when
  `session.driver` is unset, so the binding cannot be removed from the Worker.
- Cloudflare merges `_headers` rules and joins duplicate header values, so an
  immutable rule cannot exclude the manifests by path pattern.

## Steps

1. Generate `public/icon.png` (192x192, palette) and a tightened
   `public/logo_svg.svg`; delete `public/logo.png`.
2. Render the lockup as two images inside `.site-logo`, preload both, and add
   flex layout rules that preserve the current 360x69 rendered size.
3. Update the production origin in `astro.config.mjs`, `wrangler.jsonc`,
   the robots/sitemap/metadata fallbacks, tests, and `.project/` documentation.
4. Declare `kv_namespaces` with the existing `SESSION` namespace id.
5. Emit bundle paths under `/search-index/bundles/`, move the 90 bundle files,
   rewrite the manifest paths, and add the immutable `_headers` rule.
6. Record the domain, session-binding, and caching decisions in `.decisions/`.
7. Run the full verification workflow and UI checks, then deploy and smoke-test
   production.

## Verification

- `python3 scripts/verify.py --mode ci --full`.
- `npm run check:worker`, confirming no binding needs provisioning.
- Screenshot the header at desktop and mobile widths in both themes and compare
  the measured lockup size with the previous 360x69.
- Confirm brand asset bytes and dimensions match `.project/performance.md`.
- After deployment: new-origin routes, canonical, robots, and sitemap; immutable
  bundles and revalidated manifests; a real query returning results without
  console errors; the previous domain no longer resolving.

## Open Issues

- Wrangler cannot delete a Worker custom domain, so detaching the previous
  domain may require a dashboard action.
- The issue-report Google Form text still references the previous origin and
  must be edited by the operator.
