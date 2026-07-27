# Plan

## Goal

Tighten the narrow-layout spacing between the Docs label and its segmented
control, while separating Search syntax to the left from EN/JA on the right.

## Scope

- Adjust the existing narrow header action row and Docs settings row in CSS.
- Extend the existing responsive E2E geometry assertions.
- Update current-state testing documentation.

## Non-goals

- Changing control order, labels, behavior, or desktop layout.
- Changing source selection or locale persistence.

## Assumptions

- The requested alignment applies to the existing narrow layout at 760 px and
  below.
- Search syntax and EN/JA remain on the same row below the centered title.

## Steps

1. Stretch the narrow header action row across the panel and distribute Search
   syntax to the left edge and EN/JA to the right edge.
2. Size the narrow Docs row to its label and segmented control, then align that
   compact group to the right edge with an 8 px gap.
3. Add responsive geometry assertions and run full verification.
4. Commit, push to `dev`, and monitor CI.

## Verification

- Search syntax shares the panel's left edge at narrow widths.
- EN/JA shares the panel's right edge.
- The Docs label is no more than 8 px from the segmented control.
- The Docs control remains at the panel's right edge.
- Desktop geometry and all existing behavior remain unchanged.

## Open Issues

None.
