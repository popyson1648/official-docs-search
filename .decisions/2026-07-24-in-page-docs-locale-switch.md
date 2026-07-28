# Decision

## Title

Keep documentation-locale changes in page and reuse one search worker

## Date

2026-07-24

## Status

Accepted; the independent visible Docs control and preference were superseded
by `2026-07-28-unified-interface-and-document-language.md`. The in-page worker
and cache decision remains active for the unified language control.

## Decision

Changing the Docs locale updates the current page instead of submitting the
search form and loading a new document.
The client persists the preference cookie, updates the URL with
`history.replaceState`, refreshes locale-dependent source notices, and reruns
the existing query.

Use one search worker for the page lifetime.
Keep the manifest promise and successfully loaded content-addressed bundles in
worker memory, assign every request a unique ID, and ignore stale results when a
newer locale request finishes first.
Failed fetches are removed from their cache so a later request can retry.

## Context

The former locale control submitted the whole form.
That reloaded the Astro page, created a new worker, fetched the manifest again,
and discarded all in-memory index bundles.
The local English-to-Japanese Python switch took 66–167 ms, but the same
interaction took 3,956 ms under 4x CPU throttling, Fast 3G, and a disabled
browser cache.

## Alternatives

- Keep full navigation and rely only on HTTP caching: rejected because it still
  repeats HTML, client initialization, manifest work, and worker creation.
- Search on the main thread: rejected because index parsing and ranking must not
  block interaction.
- Add a service worker, Cache API, or IndexedDB: rejected because the HTTP cache
  and page-lifetime memory cache meet the measured need without another
  persistence lifecycle.
- Prefetch every Japanese bundle: rejected because most users select only a
  small language/source set and unused prefetches would increase transfer.

## Reason

Locale changes alter the selected index set but do not require a new server
document.
A persistent worker preserves already paid parsing work, keeps CPU work off the
main thread, and lets repeated locale changes reuse exact content-addressed
bundles.

## Consequences

- Locale controls must keep the URL, cookie, active button, results dataset,
  fallback notice, and source availability marks synchronized.
- Query-level `locale:` remains authoritative over the control.
- Browser tests must prove no new document request occurs.
- The first uncached switch may still transfer one locale bundle.
- E2E budgets are 1,500 ms for a first Fast-3G switch and 500 ms for a repeated
  switch under 4x CPU throttling, with no warm-switch Long Task over 50 ms.

## Revisit Conditions

- Production measurements miss the first-switch budget because common bundles
  are too large.
- Page-lifetime worker memory becomes excessive for realistic source changes.
- Search moves to a server-side service or bundle routing changes.
- Offline search becomes a product requirement.
