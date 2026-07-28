# Plan

## Goal

Replace two logically overlapping non-official-source switches with one
always-visible three-state control while retaining the detailed Sources
disclosure.

## Scope

- Offer `official`, `fallback`, and `all` source policies in the current
  settings area.
- Keep the fallback policy as the default.
- Reflect the effective policy in every source checkbox.
- Preserve hidden individual selections while a policy temporarily makes
  those sources unavailable.
- Preserve the Sources disclosure state across policy-triggered navigation.
- Migrate the existing source-mode and automatic-fallback cookies.

## Non-goals

- Remove or redesign the Sources disclosure.
- Change source admission, authority classifications, ranking, or indexes.
- Change explicit `source:official` and `source:all` query syntax.

## Assumptions

- The three policies are mutually exclusive levels of one setting, not
  independent booleans.
- Explicit query syntax continues to override the persisted UI policy.
- Temporarily unavailable source choices should look unchecked but be restored
  if the user returns to a policy that allows them.

## Steps

1. Add a shared source-policy model and map legacy preferences to it.
2. Replace the two switches with one accessible, visible three-option control.
3. Resolve checked and disabled source-option state from the selected policy,
   including per-language fallback eligibility and preserved choices.
4. Persist the policy and restore an open Sources disclosure after the form
   navigation caused by a policy change.
5. Update project documentation and add unit and browser regressions.
6. Verify the implementation and inspect desktop and mobile layouts.

## Verification

- `git diff --check`
- `python3 scripts/verify.py`
- Production-browser inspection at desktop and 375 CSS pixels

## Open Issues

- None.
