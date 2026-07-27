# Decision

## Title

Place Search syntax help beside the Search submit button

## Date

2026-07-27

## Status

Accepted

## Decision

Keep EN/JA as the only header action. Place a neutral 44 px icon button
immediately after the visible Search submit button. Use a circled question-mark
icon, localized hover/focus tooltip, accessible name, and explicit relationship
to the existing modal dialog.

Keep the dialog's visible close button and return focus to the help trigger when
the dialog closes.

## Context

Search syntax describes the query field, but its previous header position made
it look like a global site action. On narrow screens the trigger was at the left
edge while the dialog close action appeared at the right edge. Moving it into
the global-action area would also break the right-edge relationship between the
UI-language and Docs-locale controls.

This decision supersedes only the Search syntax placement in
`2026-07-27-header-and-settings-alignment.md`; its title, language, and settings
alignment decisions remain current.

## Alternatives

- Keep Search syntax at the left edge below the title.
- Put Search syntax next to EN/JA in the top-right global action area.
- Put the help icon inside the text field.
- Replace the visible Search label with a search icon to reclaim width.

## Reason

The trigger is closest to the control it explains without mixing search-specific
help with global language settings. A separate neutral button remains
distinguishable from search submission, preserves a visible Search label, and
retains a 44 px target on narrow screens.

## Consequences

- The query input is narrower by 52 px including the additional gap.
- Typical short documentation queries still fit at supported mobile widths.
- The icon requires a localized tooltip and accessible name.
- Responsive tests cover 320 px as well as 375 and 390 px.
- EN/JA remains right-aligned independently of the centered title.

## Revisit Conditions

Revisit if typical queries become substantially longer, 320 px usability tests
show material text-entry problems, or the search row gains another action.
