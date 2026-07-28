# Decision

## Title

Use one visible three-state policy for non-official sources

## Date

2026-07-28

## Status

Accepted

## Decision

Keep the Sources disclosure and its individual source controls.
Replace the two independent-looking non-official-source switches with one
always-visible, mutually exclusive control.
Label the control as non-official sources and phrase each choice as its
inclusion policy, so the label and choices read as one statement:

- official sources only;
- reviewed non-official sources only when a language has no browsable official
  reference;
- include non-official sources.

The fallback policy remains the default.
Policy changes preserve individual source choices and the Sources disclosure
state.
Explicit `source:official` and `source:all` query syntax retains precedence.

## Context

The global include switch and conditional fallback switch represented only
three effective policies with four visual combinations.
When global inclusion was enabled, the fallback switch had no effect.
Users need to change the effective source policy quickly while searching and
also need the Sources disclosure for detailed selection.

## Alternatives

- Keep two switches and disable or indent the fallback switch conditionally.
- Move the policies into the Sources disclosure.
- Hide the policies in a pop-up menu.

## Reason

One mutually exclusive control exposes the actual state model without a
redundant combination.
Keeping it in the current settings area supports one-action changes during a
search, while the existing disclosure retains detailed control.

## Consequences

The source policy becomes one persisted preference.
Legacy source-mode and automatic-fallback cookies are read for migration.
Unavailable non-official sources render unchecked and disabled, but their
individual selections remain recoverable when the policy changes.

## Revisit Conditions

Revisit if three visible choices do not fit supported mobile widths or if user
testing shows that the fallback policy label is misunderstood.
