# Decision

## Title

Persist the appearance setting in an SSR-readable cookie

## Date

2026-07-30

## Status

Accepted

## Decision

Offer Dark, Light, and System settings in an accessible header menu. Default to
System, store the setting in the `ods_theme` cookie, and render it as a root
HTML data attribute before CSS loads. Keep the existing light palette unchanged
and express dark colors through the same semantic CSS variables.

## Context

The page is server-rendered and already varies by Cookie. A browser-only saved
setting would apply after the initial response and could show the wrong theme
briefly. System also needs to follow operating-system changes without a reload.

## Alternatives

- Store the setting only in local storage.
- Add separate theme-specific pages or query parameters.
- Use only the operating-system setting with no explicit override.

## Reason

The cookie lets SSR select the right palette before first paint, requires no
new route, and preserves the single-entry-page product model. CSS media queries
can keep System synchronized while the small client controller handles menu
behavior and browser metadata.

## Consequences

Theme responses vary with the existing Cookie cache key. The client must keep
the root setting, cookie, radio-menu state, `color-scheme`, and `theme-color`
metadata synchronized. Light and dark palettes require contrast and browser
coverage whenever semantic color tokens change.

## Revisit Conditions

Revisit if caching moves to a layer that cannot vary HTML by Cookie, or if the
site adopts an account-backed preference service.
