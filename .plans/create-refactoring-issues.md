# Plan

## Goal

Create actionable local refactoring issues under `.tmp/issue/` for incomplete functionality, known concerns, cleanup, and maintainability work remaining after the federated-search implementation.

## Scope

- Create seven Japanese Markdown issue files.
- Give every issue an explicit `Open` or `Closed` status field.
- Record background, current problem, scope, acceptance criteria, verification, dependencies, and exclusions.
- Base each issue on the current repository state and verified known concerns.

## Non-goals

- Implement the refactoring work described by the issues.
- Create remote GitHub issues.
- Delete historical plans or decisions during this task.
- Commit, merge, or deploy changes.

## Assumptions

- Newly created issues start in `Open` state.
- `.tmp/` is intentionally excluded through `.git/info/exclude` and is not committed.
- Historical decisions should normally be marked superseded rather than deleted without an explicit retention decision.

## Steps

1. Create `.tmp/issue/`.
2. Write one issue per approved concern with an explicit state.
3. Cross-check issue scopes for overlap and dependencies.
4. Verify all files exist, contain required sections, and remain ignored by Git.

## Verification

- Confirm seven Markdown files exist under `.tmp/issue/`.
- Confirm every issue contains `Status: Open`.
- Confirm every issue contains acceptance criteria and verification sections.
- Confirm `git check-ignore` reports the issue files as ignored.

## Open Issues

- None for this documentation-only task.
