# Decision

## Title

Use the Google Results only layout and separate result locale from UI language

## Date

2026-07-22

## Status

Superseded

Superseded by [Replace Google Programmable Search with federated browser-side documentation indexes](./2026-07-23-federated-browser-search-index.md).

## Decision

Configure Google Programmable Search with the documented Results only layout (`element_layout="7"`) and the `gq` query parameter used by the application.
Pass the application UI language to the Search Element through `hl`.
Pass the selected documentation locale independently through the Search Element `lr` restriction.

## Context

The generated context used `element_layout="8"`, which is not a documented layout value and caused the live engine to return overlay results.
The page attempted to convert that overlay to inline results with CSS.
The Docs locale control was used only for support notices and did not affect the Google query.

## Alternatives

- Keep the overlay configuration and continue overriding Google layout CSS.
- Use query text or site-path conventions to approximate result language.
- Combine UI language and documentation locale into one setting.

## Reason

Results only is the provider-supported layout for an application that supplies its own search form.
`hl` and `lr` represent different user choices and must not be coupled.
Provider-supported options are more stable than rewriting an overlay layout with CSS.

## Consequences

- The regenerated `public/search/context.xml` must be uploaded to the Google control panel.
- Changing UI language changes Google Search Element copy but not the requested documentation language.
- Changing Docs locale restricts result language but does not change application copy.
- The application displays loading, empty, provider-error, and verification-required states explicitly.

## Revisit Conditions

- Google changes or removes the Results only, `hl`, or `lr` options.
- Result-language restriction quality is insufficient for documentation sites with mixed-language pages.
- The project replaces Google Programmable Search.
