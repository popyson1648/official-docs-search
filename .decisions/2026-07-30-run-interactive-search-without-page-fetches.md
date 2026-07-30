# Decision

## Title

Run interactive searches without fetching another page

## Date

2026-07-30

## Status

Accepted

## Decision

Keep the first-party GET form as a no-JavaScript and direct-link fallback, but
handle normal in-page submissions entirely in the client. Parse the query,
resolve source scope, update the URL and result state, and reuse the existing
search worker without requesting new server-rendered HTML.

Continue to render canonical direct-link state on the server. Directly opening,
reloading, or sharing a query URL therefore remains functional and uses
`noindex,follow`.

## Context

Astro client routing preserved the document and worker cache, but still fetched
HTML containing the search query for every submission. The search indexes and
ranking already run in the browser, so the HTML request added cost and exposed
the query to the hosting layer without contributing search work.

## Alternatives

- Continue fetching and swapping server-rendered HTML through `ClientRouter`.
- Move search state to a URL fragment and remove the GET fallback.
- Build a separate JSON state API.

## Reason

Local submission removes a Worker request and avoids sending ordinary search
terms to the server while preserving linkability, progressive enhancement,
history, source controls, accessibility, and the existing search worker cache.

## Consequences

- The server embeds a compact source catalog and a reusable hidden results
  mount so client submissions can resolve the same state.
- Direct query loads include hidden source groups so changing languages locally
  does not require another page.
- Query URLs may still reach Cloudflare when directly opened, reloaded, shared,
  or submitted without JavaScript, and the Privacy Policy states this.
- E2E tests verify that interactive submissions make no query-page request.

## Revisit Conditions

Revisit if the client and server scope resolution diverge, the embedded catalog
materially harms first-load performance, browser history becomes unreliable,
or a static application architecture can remove the fallback server path.
