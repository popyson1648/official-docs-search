# Structure

## Top-level Directories

- `src/`: Astro application and TypeScript source.
- `src/core/`: Query parsing, source resolution, i18n, and search provider logic. Keep this framework-independent.
- `src/data/`: TOML source catalog for official, conventional, and community documentation sites.
- `src/pages/`: Astro routes.
- `public/`: Static assets and CSS.
- `tests/`: Vitest unit tests.
- `.plans/`: Approved implementation plans.

## Important Modules

- `src/core/query.ts`: Parses user queries and validates flag placement.
- `src/core/sources.ts`: Loads TOML, resolves selected documentation sources, and filters result URLs.
- `src/core/search.ts`: Defines the search provider interface and provider implementations.
- `src/core/i18n.ts`: UI language messages.
- `src/pages/index.astro`: Server-rendered search page.

## Where To Make Changes

- Add or revise documentation sources in `src/data/docs-sources.toml`.
- Change query syntax in `src/core/query.ts` and update `tests/query.test.ts`.
- Change source allowlist behavior in `src/core/sources.ts` and update `tests/sources.test.ts`.
- Keep UI-specific changes in `src/pages/` and `public/styles.css`.

## Areas That Require Extra Care

- Do not let search results bypass `isAllowedResultUrl`.
- Do not parse programming-language syntax inside search words.
- Keep framework-specific Astro code out of `src/core`.
- Keep generated directories such as `node_modules/`, `dist/`, and `.astro/` untracked.
