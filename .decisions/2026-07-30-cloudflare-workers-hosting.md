# Decision

## Title

Deploy LangRef Search to Cloudflare Workers

## Date

2026-07-30

## Status

Accepted

## Decision

Use the Astro Cloudflare adapter and Cloudflare Workers as the production
runtime. Serve matching static assets before invoking the Worker. Disable
Workers persistent observability and do not add application analytics.

Use Wrangler for local preview, generated deployment configuration, dry-run
validation, and production deployment. Do not deploy automatically from a local
task.

## Context

The service is an on-demand rendered Astro application with a large set of
static search indexes. The expected audience is global and cost sensitivity
depends mostly on Worker invocations and static transfer rather than database
or session writes.

## Alternatives

- Keep the custom Node production server on a VM or container.
- Deploy to Vercel Functions.
- Convert the application to a fully static site.

## Reason

Workers provides global edge execution, direct static-asset delivery, DDoS
protection, and a predictable deployment target without maintaining a server.
The application does not require a database, queue, or long-running process.

## Consequences

- `@astrojs/cloudflare` and Wrangler are production dependencies.
- `wrangler.jsonc` defines the compatibility date, domain route, and disabled
  persistent observability.
- Astro automatically provisions a `SESSION` KV binding, but the application
  does not use Astro sessions or write session data.
- Cloudflare's production edge performs transport compression; committed
  precompressed sidecars and the custom Node server are removed.
- Tests run against Astro's workerd-based preview.

## Revisit Conditions

Revisit if Workers pricing, runtime limits, or privacy controls no longer fit
the traffic profile, or if the application needs infrastructure that cannot be
provided reliably on Workers.
