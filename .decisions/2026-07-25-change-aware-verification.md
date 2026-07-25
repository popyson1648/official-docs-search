# Decision

## Title

Select verification phases and live sources from the changed-file impact

## Date

2026-07-25

## Status

Accepted

Supersedes the requirement in
[Require deterministic browser verification for user-facing search behavior](./2026-07-22-deterministic-browser-verification.md)
that browser E2E must run for every pre-commit and CI invocation.

## Decision

Use one repository-owned classifier to select verification phases from changed
paths.
Run deterministic browser E2E for user-facing, catalog, production-serving, and
committed-index changes, but skip it for changes that cannot affect those
behaviors.
Classify documentation-only changes explicitly and fall back to every
mode-eligible phase for any unknown implementation or configuration path.

Select live index verification by affected source family.
Run all live sources after shared generator, HTTP, catalog, or schema changes.
Run GNU/GCC sources only after GNU-specific or shared live-index changes, plus a
monthly scheduled refresh that is separate from the weekly non-GNU refresh.
Do not make live upstream availability a requirement for ordinary CI.

## Context

The default verification command unconditionally ran every enabled phase,
including live regeneration and link checks for every upstream source.
GCC requests intentionally observe a 60-second crawl delay, so unrelated local
changes could spend several minutes waiting for GNU documentation.
Pre-commit and CI also ran the complete browser suite and rebuilt the production
application repeatedly even for isolated tests or documentation.

The browser suite remains valuable, but its cost does not add evidence for
parser-only, documentation-only, dependency-audit-only, or server-contract-only
changes.

## Alternatives

- Continue running every check after every change.
- Use only GitHub Actions `paths` filters and omit the CI workflow entirely.
- Maintain separate change logic in CI, pre-commit, and local scripts.
- Skip slow checks by default and depend on developers to request them
  manually.
- Ignore the GCC crawl delay or reduce it below the upstream policy.

## Reason

A shared classifier keeps local and remote behavior reviewable and consistent.
Explicit dependencies retain deterministic coverage while eliminating checks
that cannot observe the changed behavior.
Failing safe on unknown paths prevents an incomplete rule from silently
reducing coverage.
Keeping the CI workflow present gives branch protection a completed check even
when documentation changes require no Node verification.

Source-family selection respects upstream constraints and makes live
verification proportional to the change.
Separating GNU scheduling reduces routine refresh time without weakening checks
when GNU or shared indexing code actually changes.

## Consequences

- Verification configuration includes file-impact metadata in addition to mode
  flags and commands.
- Local, pre-commit, and CI invocations report selected and skipped phases.
- Documentation-only CI completes without installing Node dependencies.
- Browser and server tests reuse a production build when both are selected.
- Explicit full verification remains available for releases and final review.
- Live index commands accept affected source-family or source selections.
- Weekly non-GNU and monthly GNU refreshes may create separate update runs.

## Revisit Conditions

- A regression is traced to an incorrect path-to-phase or path-to-source rule.
- Repository structure changes enough that the classifier has frequent unknown
  paths.
- Test timings become small enough that selection complexity no longer pays for
  itself.
- Search-index generation moves to a service with different upstream rate-limit
  guarantees.
