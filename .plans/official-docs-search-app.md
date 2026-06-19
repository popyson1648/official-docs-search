# Plan

## Goal

Build the first version of Official Docs Search at `official-docs-search.popyson.com`.
The site searches only trusted programming-language documentation sources, defaults to official sources, and supports language, documentation locale, and trusted source controls.

## Scope

- Astro + TypeScript server-rendered application.
- Core query parser that treats code syntax as opaque search text.
- TOML-managed source catalog with site names, domains, source kind, language support, and locale support.
- Server-side search provider abstraction with allowlist filtering.
- Search UI with source controls, detailed trusted-source selection, UI language switch, help modal, and flag highlighting.
- Unit tests for parser, source resolution, URL/domain filtering, and provider query generation.

## Non-goals

- Framework documentation such as Spring, Rails, Django, or React docs.
- Full self-hosted crawler/index in the first version.
- User accounts or shared source presets.
- Automatic merging to `main`.

## Assumptions

- Programming-language docs only.
- Default source mode is official-only.
- Trusted sources can include conventional and community sources that are widely trusted by that language's community.
- The first search provider may use Google Custom Search JSON API, but every result URL must be verified against the local allowlist before display.
- UI language and documentation locale are separate settings.

## Steps

1. Create a dedicated branch.
2. Create the Astro + TypeScript app structure.
3. Keep framework-independent logic under `src/core`.
4. Implement strict prefix/suffix flag parsing:
   - `<language> <search words>`
   - `<language>,<language> <search words>`
   - `lang:<language>[,<language>] <search words>`
   - `<search words> locale:<locale>`
   - `<search words> source:<official|all>`
5. Treat all code syntax inside search words as opaque text.
6. Build a TOML source catalog with source names and domains.
7. Implement source resolution, locale support notices, and allowlist filtering.
8. Implement a search provider interface and initial provider.
9. Build a simple monotone UI inspired by programming-language documentation sites.
10. Add tests and wire `scripts/verify.py`.

## Verification

- `python3 scripts/verify.py`
- Local browser smoke test against the dev server.

## Open Issues

- Exact production search provider credentials are not available during local implementation.
- Source catalog can start with a conservative seed list and should be expanded through reviewed TOML changes.
