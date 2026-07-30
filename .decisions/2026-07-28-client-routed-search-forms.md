# Decision

## Title

Use Astro client routing for GET search form submissions

## Date

2026-07-28

## Status

Superseded by `2026-07-30-run-interactive-search-without-page-fetches.md`

## Decision

Enable Astro's `ClientRouter` on the search page so GET search form submissions and source-policy changes replace the rendered page without creating a new document.

Disable transition animations, initialize page behavior on `astro:page-load`, and keep the normal HTML GET form as the no-JavaScript fallback. Preserve the existing fonts, focus, scroll, browser history, source-details state, and loading UI.

## Context

Full document navigation discarded the browser search worker and its in-memory index cache. Repeated searches and source-policy changes therefore paid page startup and index-loading costs that were unrelated to the changed search state.

## Alternatives

- Keep full document navigation and rely only on HTTP caching.
- Build and maintain a custom HTML fetch-and-swap implementation.
- Move all server-derived search state into a new client-side application.

## Reason

Astro's router already handles GET forms, history, document swapping, lifecycle events, and route accessibility. It preserves the JavaScript realm, allowing the existing worker and index cache to survive, while requiring substantially less custom navigation code. The unchanged form still works when client JavaScript is unavailable.

## Consequences

- Search and source-policy submissions fetch fresh server-rendered HTML without reloading the document.
- The existing worker and loaded indexes are reused across submissions.
- Page initialization must be safe to run after every `astro:page-load`.
- Global listeners and observers need explicit cleanup when their body elements are replaced.
- Client-routed and fresh-load result snapshots must remain identical in E2E tests.

## Revisit Conditions

Revisit if Astro removes GET form interception, if router overhead outweighs repeat-navigation savings, or if a server API can update the same state with less code while preserving progressive enhancement and accessibility.
