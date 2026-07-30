# Plan

## Goal

Add one accessible source-group toggle that includes or excludes proposal sources such as Python PEPs, TC39 proposals, WG21 papers, and OpenJDK JEPs.

## Scope

- Derive membership from the catalog's `document_kind = "proposal"` metadata.
- Render the group toggle above the individual source list when proposal sources are present.
- Keep the binary group toggle synchronized with individual proposal-source checkboxes.
- Add English and Japanese labels, compact styling, and automated coverage.

## Non-goals

- Do not filter individual records by proposal lifecycle status.
- Do not change proposal ranking, catalog defaults, or index contents.
- Do not modify unrelated upstream URL or generated-index changes already in the worktree.

## Assumptions

- Proposal sources remain enabled by default through their existing `default_enabled` values.
- The group toggle is a shortcut for the existing source checkboxes; submitted `sourceId` values remain the canonical state.
- The group toggle is on when any proposal source is selected and off when none are selected; it never has a third visual state.
- Changing this toggle follows individual source-checkbox behavior and takes effect when the search form is submitted.

## Steps

1. Add proposal metadata to rendered source controls and a localized group toggle to the source panel.
2. Implement synchronization between the group toggle and eligible individual proposal-source checkboxes.
3. Style the control to match the existing compact source panel and preserve accessible focus and target sizing.
4. Add unit/browser tests for all-selected, none-selected, and partially-selected states.
5. Update short project documentation if the user-visible source-selection contract needs clarification.

## Verification

- Run focused source-control unit tests.
- Run focused filter/browser tests, including desktop and mobile layout assertions for the new control.
- Run `python3 scripts/verify.py` and report any pre-existing live-index failures separately.

## Open Issues

- None.
