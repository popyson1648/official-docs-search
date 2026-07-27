# Decision

## Title

Keep automatic non-official fallback silent

## Date

2026-07-27

## Status

Accepted

## Decision

Do not render a message or message box when reviewed non-official references
are enabled automatically.
Keep the persisted setting and the automatic per-language fallback behavior.

## Context

The automatic-fallback notice occupied prominent result-page space and repeated
behavior already controlled by the source settings.

## Alternatives

- Keep the bilingual notice and its settings link.
- Reduce the notice to an inline status.

## Reason

The fallback is a default search-source selection, not an error or a condition
that requires interruption.
Users can still inspect and change it in the existing settings.

## Consequences

Automatic fallback remains configurable and covered by browser tests, but its
application does not add a result-page message.
Explicit `source:official`, `source:all`, and the disabled setting keep their
existing precedence.

## Revisit Conditions

Revisit only if silent fallback causes demonstrated source-trust confusion that
cannot be addressed in the source controls.
