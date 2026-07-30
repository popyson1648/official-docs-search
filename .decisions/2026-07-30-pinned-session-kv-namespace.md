# Decision

## Title

Pin the adapter's session KV namespace instead of provisioning it per deployment

## Date

2026-07-30

## Status

Accepted

## Decision

`wrangler.jsonc` declares the `SESSION` KV binding with the existing namespace
id `da2f8c396f144018bd3cd2f6a381f292`. The application still never calls
`Astro.session`, so the namespace stays empty.

## Context

The first production deployment printed "The following bindings need to be
provisioned" and created a `langref-search-session` KV namespace. Nothing in the
application uses server-side sessions; interface state is kept in cookies and
browser `sessionStorage`. `@astrojs/cloudflare` 14.1.7 injects
`sessionDrivers.cloudflareKVBinding()` whenever `session.driver` is unset, and
neither Astro nor the adapter documents a way to disable sessions, so the Worker
always declares the binding. Because the id lived only in the Cloudflare
dashboard, every deployment relied on name-based provisioning, which Cloudflare
documents as not writing ids back to the repository.

## Alternatives

- Leave provisioning implicit: deployments stay non-deterministic, and a
  deployment from another environment can create a second namespace.
- Point `session.driver` at an in-memory driver such as
  `sessionDrivers.lruCache()` to avoid KV entirely: removes the binding, but
  leaves a store that appears to work while losing data between isolates if
  sessions are ever used.
- Rely on `sessionKVBindingName` to rename the binding: changes the name, not the
  provisioning behavior.

## Reason

Declaring the resource keeps deployments reproducible and non-interactive,
prevents duplicate namespaces, and stays on the adapter's supported code path.
Cloudflare documents KV namespace ids as public, so committing the id is safe.

## Consequences

- `wrangler deploy` no longer provisions resources; a missing namespace fails
  loudly instead of silently creating another one.
- The empty namespace remains part of the infrastructure and is visible in the
  configuration with a comment explaining why it is unused.
- Deploying from a different Cloudflare account requires removing the id so the
  namespace is provisioned there, or replacing it with that account's id.

## Revisit Conditions

Revisit if the adapter adds a supported way to disable sessions, if the
application starts using `Astro.session`, or if the project gains a second
deployment target.
