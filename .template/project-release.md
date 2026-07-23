# Release

## Release Steps

1. Intentionally update upstream artifacts only when required and review every generated diff.
2. Run the non-mutating index check and complete verification.
3. Review supported paths, statuses, hashes, versions, counts, compressed sizes, attribution, licenses, and known queries.
4. Check language, source, locale, support-state, responsive, escaping, and safe-link browser flows.
5. Verify production compression, validators, revalidation, and immutable bundle caching.
6. Deploy the application and matching index artifacts together.
7. Smoke-test original links and delivery headers.

Scheduled updates must produce reviewable draft pull requests and must never merge automatically.

## Required Checks

- Known searches return non-empty results from allowed original domains.
- Every selected supported language appears in a combined result set.
- Planned, blocked, and disabled sources are reported explicitly.
- Production compression and cache behavior match the server contract.
- Source policy and transfer estimates are current.

## Rollback Or Recovery Notes

Restore the application and its matching generated bundles together.
An old manifest must retain access to its matching content-addressed bundles.
Keep the last verified artifacts if an upstream adapter temporarily breaks.
