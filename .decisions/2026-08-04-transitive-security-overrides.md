# Decision

## Title

Temporarily override vulnerable Cloudflare toolchain transitive dependencies

## Date

2026-08-04

## Status

Accepted

## Decision

Use exact npm overrides for PostCSS 8.5.25 and Undici 7.29.0 until the normal
Astro, Vite, and Cloudflare dependency graph resolves non-vulnerable releases.
Keep the direct Astro Cloudflare adapter and Wrangler versions within their
existing supported ranges.

Do not use `npm audit fix --force` or downgrade Wrangler to the audit command's
suggested historical release.

## Context

The production audit began reporting one PostCSS advisory affecting versions
through 8.5.22 and five Undici advisories affecting versions through 7.28.0.
Vite permits a patched PostCSS release, but the lockfile retained 8.5.22.
Miniflare 4.20260722.1 pins Undici 7.28.0 exactly. The latest published
Wrangler 4.118.0 and its Miniflare 5 alpha still pin the same vulnerable Undici
release, so updating the direct Cloudflare packages alone does not clear the
audit.

Both patched releases stay in the same major version as the packages they
replace. The full workerd preview, browser suite, production contract, Wrangler
dry-run, and startup checks cover the toolchain boundary affected by the
override.

## Alternatives

- Accept the advisories as build-time-only: rejected because the project
  requires an advisory-free production dependency graph.
- Run `npm audit fix --force`: rejected because it proposes an unrelated
  Wrangler downgrade and obscures the intended dependency changes.
- Upgrade to the latest Wrangler only: rejected because its current Miniflare
  dependency still pins Undici 7.28.0.
- Wait for another upstream release: rejected because it would leave the
  verified application change blocked from deployment indefinitely.

## Reason

Exact, same-major overrides are the smallest reviewable change that removes the
known vulnerable code without changing the application's framework or runtime
configuration. Pinning the patched versions also prevents a clean install from
reintroducing the affected releases.

## Consequences

- `package.json` temporarily owns two transitive version selections.
- Lockfile updates and clean installs must continue to pass the production
  audit and the complete Cloudflare release checks.
- Future dependency upgrades must test whether the overrides can be removed.

## Revisit Conditions

- Miniflare declares Undici 7.29.0 or later.
- The normal Vite dependency resolution selects PostCSS 8.5.23 or later.
- Either override conflicts with a supported Astro or Cloudflare release.
