# Decision

## Title

Center the search title and separate setting descriptions from controls

## Date

2026-07-27

## Status

Accepted; Search syntax placement was superseded by
`2026-07-27-contextual-search-help.md`, and the independent Docs row was
superseded by `2026-07-28-unified-interface-and-document-language.md`.

## Decision

Keep the search title geometrically centered independently of the header actions.
Order the actions as Search syntax followed by the EN/JA UI-language control.
On narrow viewports, place the title on its own row and the actions below it,
with Search syntax at the left edge and EN/JA at the right edge.

Render global setting descriptions as non-interactive text next to separately
labelled form controls. On narrow viewports, each setting occupies a full-width
two-column row so its switch or Docs-locale control shares the right edge.

## Context

Action width displaced the title, header action order did not match the intended
reading order, and wrapping setting text caused mobile switches to appear at
different horizontal positions. The two global setting descriptions were also
checkbox labels, so clicking explanatory text changed state unexpectedly.

## Alternatives

- Keep wrapping labels and align them with fixed text widths.
- Absolutely position the title over a flex header.
- Shorten labels until all controls happen to fit on one mobile line.

## Reason

A grid expresses the visual relationships without depending on translated text
length. Separating descriptions from inputs limits the interactive target to the
visible control while `aria-labelledby` retains an accessible name.

## Consequences

- Mobile setting descriptions may wrap without moving their controls.
- The compact Docs label stays next to its right-aligned segmented control.
- The switch itself, rather than its whole row, is the pointer target.
- Header and settings geometry require desktop and mobile browser coverage.
- Source names inside the expandable source picker remain checkbox labels.

## Revisit Conditions

Revisit if more header actions are added, the title cannot fit at supported
desktop widths, or usability testing shows that switches need larger dedicated
control targets.
