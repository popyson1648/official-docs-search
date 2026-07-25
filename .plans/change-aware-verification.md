# Plan

## Goal

Reduce verification time by running each check only when the changed files can
affect what that check proves, while defaulting to broader verification whenever
the impact cannot be classified safely.

## Scope

- Add one repository-owned change classifier shared by local verification,
  pre-commit, pre-push, and GitHub Actions.
- Declare each verification phase's file dependencies in
  `.project/verification.toml`.
- Skip all Node installation and test execution in CI for documentation-only
  changes while still returning a successful required CI check.
- Avoid repeated production builds when build, browser, and server-contract
  phases are selected together.
- Run browser E2E only for user-facing application, production-serving,
  catalog, or committed-index changes.
- Split browser coverage into selectable smoke, interaction, source/catalog,
  layout/accessibility, and performance concerns so a relevant UI change does
  not automatically run unrelated browser scenarios.
- Run server-contract tests only for production build/serving, catalog, or
  committed-index changes.
- Run dependency auditing only when dependency manifests or audit policy change.
  Retain a scheduled audit so newly published advisories are detected without a
  repository diff.
- Make live index checks source-aware. Run only adapters affected by a
  source-family change, run all sources for shared generator/transport/schema
  changes, and do not contact upstream sites for unrelated changes.
- Treat GNU/GCC sources as an explicit slow group. Run that group only for
  GNU-specific or shared live-index changes and in its monthly scheduled
  refresh.
- Keep the non-GNU scheduled refresh weekly.
- Remove the second full upstream regeneration currently performed immediately
  after every scheduled update. Verify the freshly generated artifacts with
  offline integrity, integration, and selected live-link checks instead.
- Add classifier, fallback, workflow, and source-selection regression tests.
- Update project and template documentation, verification configuration,
  pre-commit configuration, and workflows together.

## Non-goals

- Skipping a check based only on the developer's assertion that a change is
  safe.
- Using GitHub's top-level path filter to omit the required CI workflow
  entirely.
- Skipping all verification for unknown, deleted, renamed, or newly introduced
  implementation/configuration paths.
- Making third-party live availability a requirement for ordinary pull-request
  CI.
- Skipping GNU sources when shared indexing or HTTP behavior can affect them.

## Assumptions

- Documentation-only paths are explicitly allowlisted. Any unclassified
  non-documentation path selects every enabled phase permitted by the requested
  mode.
- Pull requests compare the checked-out merge result with the pull request base;
  pushes compare the pushed range. Missing, zero, shallow, or invalid base SHAs
  fall back to all applicable phases.
- Pre-commit receives the staged filenames from pre-commit. Local changed mode
  includes staged, unstaged, untracked, and deleted paths.
- The explicit full mode remains available for releases, verification-policy
  changes, and final review.
- Deterministic committed-index integration tests remain offline and can run
  independently from live upstream checks.

## Steps

1. Record the change-aware verification decision and conservative fallback
   policy under `.decisions/`.
2. Extend `scripts/verify.py` with changed-file inputs, Git-range discovery,
   path matching, skip explanations, machine-readable/list output, and
   fail-safe all-phase fallback.
3. Add phase dependency patterns and documentation-only exclusions to
   `.project/verification.toml` and its template.
4. Add focused Python regression tests for documentation-only, UI, parser,
   generated-index, dependency, verification-policy, unknown-path, deletion,
   and invalid-base classifications.
5. Update pre-commit to pass staged filenames and run only affected
   pre-commit phases.
6. Update CI to fetch the comparison base, classify changes before Node setup,
   skip dependency installation for a no-op change, and run the selected
   phases for code changes.
7. Remove redundant production builds by building once when a selected phase
   needs `dist/`, and remove the second integration run from the combined live
   command, while retaining standalone package commands that build their own
   prerequisites.
8. Tag or split browser scenarios by concern and expose concern-specific E2E
   commands. Map changed UI/runtime/catalog/style/performance paths to the
   smallest safe concern set.
9. Add source filters to index generation and live-link verification, with
   committed-artifact comparison for selected sources and all-source fallback
   for shared indexing changes.
10. Add a change-to-source-family classifier and package commands for affected,
   non-GNU, GNU, and explicit full live verification.
11. Split scheduled index refresh into weekly non-GNU and monthly GNU paths;
    verify only the refreshed selection before creating the draft update and do
    not regenerate the same selection twice.
12. Add a scheduled dependency-audit workflow while limiting pull-request/push
    auditing to dependency or audit-policy changes.
13. Update current project docs and templates with exact fast/default/full/live
    commands and the conservative fallback rules.
14. Measure representative documentation-only, unit-only, UI, generated-index,
    GNU-source, and full-verification cases; run the full suite and monitor the
    pushed GitHub Actions run.

## Verification

- Classifier unit tests cover every configured phase and every source-family
  group.
- Documentation-only CI performs no `npm ci` and no Node test command.
- A unit-test-only change runs unit tests but not browser E2E, server contract,
  dependency audit, or live fetches.
- A UI change runs typecheck, build, focused unit/integration coverage, and E2E
  but not live upstream checks.
- A production-server change runs build and server contract without browser
  E2E unless the browser path is also affected.
- A dependency-lock change runs all offline checks and dependency audit.
- A GNU adapter change contacts only the affected GNU source; a non-GNU adapter
  change makes no request to `gcc.gnu.org`.
- A shared generator, HTTP, catalog, or schema change selects all relevant
  sources, including GNU.
- An unknown implementation/configuration path and an invalid comparison base
  both select all phases allowed by the requested mode.
- `python3 scripts/verify.py --mode ci` passes in explicit full mode.
- `python3 scripts/verify.py` passes for the completed change set.
- The pushed `dev` GitHub Actions run completes successfully.

## Open Issues

- Source-family files currently contain several source jobs. Family-level
  selection may be the safest first granularity where a changed parser cannot
  be mapped reliably to one job.
- Scheduled GNU refresh duration remains constrained by GCC's published
  60-second crawl delay; the goal is to run it less often, not bypass it.
- GitHub Actions deprecation warnings for upstream action runtimes are separate
  from repository test selection and may require action-version upgrades.
