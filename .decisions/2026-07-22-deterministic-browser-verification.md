# Decision

## Title

Require deterministic browser verification for user-facing search behavior

## Date

2026-07-22

## Status

Accepted

Applies to the architecture in [Replace Google Programmable Search with federated browser-side documentation indexes](./2026-07-23-federated-browser-search-index.md).

## Decision

Run browser end-to-end tests as part of the repository's standard verification, pre-commit workflow, and CI.
Exercise the federated search UI against committed generated indexes and verify every user-facing behavior branch with semantic assertions.
Keep upstream index fetching in a separate, non-destructive live verification phase rather than making CI depend on third-party availability.

## Context

The previous verification enabled type checking, builds, and unit tests but disabled browser E2E tests.
The former provider fixture could prove DOM integration but could not prove that committed indexes produced useful results.
The current application owns index loading, ranking, source coverage, and result rendering, so browser tests can exercise the real local search path deterministically.

## Alternatives

- Depend only on unit tests.
- Download current upstream indexes during every CI run.
- Mock manifest and bundle responses in all browser tests.
- Keep browser checks as optional one-off scripts.

## Reason

A committed index snapshot makes source selection, query parsing, localization, worker-backed search, UI state, mobile layout, and error handling repeatable.
Semantic assertions prevent an empty shell or hidden container from being treated as a successful result.
Making the phase mandatory prevents UI regressions from bypassing the normal completion check.

## Consequences

- `python3 scripts/verify.py` includes browser E2E tests.
- Browser tests assert non-empty titles, allowed original URLs, expected languages and sources, locale restrictions, safe new-tab links, and visible result dimensions.
- CI verifies committed bundles; `npm run test:live` checks current upstream data without modifying committed output.
- Upstream availability and freshness are not CI guarantees.
- Changes to user-facing search behavior require corresponding E2E updates.

## Revisit Conditions

- Browser-test runtime becomes unsuitable for pre-commit use.
- Committed indexes become too large for routine browser verification.
- Search execution moves to a service that provides an equally deterministic official test environment.
