# Decision

## Title

Compress private HTML in the Worker and preload bounded direct-search indexes

## Date

2026-08-02

## Status

Accepted

## Decision

Keep `private, no-cache, no-transform` on every rendered HTML document, and
negotiate gzip in the application middleware. For a gzip-capable request, set
`Content-Encoding: gzip`, remove a stale length, merge
`Vary: Accept-Encoding`, and let the Cloudflare Workers runtime perform its
automatic streaming encoding.

For a valid direct query, emit cross-origin-compatible fetch preloads for the
revalidated runtime manifest and at most four exact selected index bundles,
with a cumulative 500 KiB deterministic Brotli-size ceiling. Emit no search
preload for an empty, invalid, or no-source state.

Split the generated font-face catalog by family and apply it from client code
after document parsing. Load LINE Seed JP only when Japanese UI or results need
it. Inline the compact structural stylesheet into the compressed private HTML
so it has no network dependency, and retain normal font stylesheets inside
`noscript`.

Remove Astro `ClientRouter`. Local search state owns history entries and
restores them on `popstate`; direct links and no-JavaScript forms keep ordinary
document navigation.

## Context

The 2026-08-02 production audit found a 163,577-byte direct-query document sent
without content coding because `no-transform` disables edge compression. The
same document is about 17.5 KiB with gzip. Removing `no-transform` would allow
automatic Web Analytics injection and contradict the published privacy policy.

The render-blocking stylesheet also contained 248 LINE Seed JP face rules even
on an English page, and the now-local interactive search path still shipped a
16,132-byte `ClientRouter` module. A cold direct query discovered the runtime
manifest only after the page module and worker loaded, then discovered bundles
after the manifest completed.

A precompressed `CompressionStream` response with `encodeBody: "manual"` was
tested first. Astro's local preview proxy transparently decodes the inner
workerd response, so the server contract cannot observe that transport header.
Direct workerd inspection confirmed that Workers automatic response encoding
retains the privacy cache directive and emits the expected 17.5 KiB gzip body.

## Alternatives

- Remove `no-transform` and depend on a dashboard-only Web Analytics setting.
- Keep HTML uncompressed to preserve the privacy header.
- Buffer and precompress every rendered document in application memory.
- Embed the complete runtime manifest in every document.
- Preload every selected bundle without a count or byte ceiling.
- Keep the Japanese font catalog and `ClientRouter` on every initial path.

## Reason

Worker response encoding makes inlining the page CSS inexpensive, removes the
measured HTML transfer waste without allowing
an intermediary to rewrite private HTML and without buffering the document.
Bounded hints remove serial network discovery only for resources the direct
query will request, while protecting paint from broad-query overfetch.
Family-specific asynchronous font CSS and removal of the obsolete router cut
the render path without changing the product's typography, progressive
enhancement, or in-page cache behavior.

## Consequences

- HTML variants must always include `Accept-Encoding` in `Vary` and preserve
  the existing locale and cookie variance.
- Astro preview's public Node port may expose the decoded workerd response;
  tests compare decoded identity and enforce the deterministic gzip budget,
  while release measurements inspect the direct workerd or deployed response.
- Runtime manifest entries include gzip and Brotli planning sizes.
- Page CSS is repeated in private HTML instead of using the browser's shared
  stylesheet cache; normal interactive searches do not request new HTML, and
  the 25 KiB encoded-document budget limits that tradeoff.
- Generated font CSS now has one committed file per family.
- Browser history restoration belongs to `search-controls.ts`, not Astro's
  transition lifecycle.
- Unversioned visible logo assets use a bounded one-day fresh lifetime plus
  stale-while-revalidate instead of immutable caching.

## Revisit Conditions

Revisit if Cloudflare provides a repository-controlled guarantee that automatic
analytics injection is disabled, if Workers response-encoding semantics change,
if preload reuse fails in deployed browsers, or if field data shows font
deferral regresses LCP or CLS.
