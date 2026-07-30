# Plan

## Goal

Make search results reach live documentation pages for DevDocs-derived sources
whose upstream sites are case-sensitive, and render the mobile virtual keyboard
enter key in the standard key color instead of the system action tint.

## Scope

- Restore upstream path case for `rust-docs` result URLs.
- Restore upstream path case for `perl-docs` result URLs.
- Strengthen `rust-docs` known queries so live verification covers API pages.
- Regenerate the affected search index bundles and manifest.
- Add `enterkeyhint="enter"` to the query input.

## Non-goals

- Changing ranking, grouping, or result rendering.
- Changing any other source adapter.
- Colouring the virtual keyboard directly; no web API exposes that.

## Assumptions

- DevDocs lowercases every index path, and the `name` field keeps the upstream
  item case for Rust and Perl.
- Rust module path segments are snake_case upstream, so only the final
  `<kind>.<Item>` segment needs case repair.
- Rust fragments only use `method.` and `tymethod.` prefixes with snake_case
  method names, so fragments need no repair.

## Steps

1. Pass the source DevDocs entry to `buildUrl` in `normalizeDevdocsEntries`.
2. Add `restoreRustdocPathCase` to the job helpers and use it in the
   `rust-docs` job.
3. Use the entry title whenever it case-insensitively equals the DevDocs path
   in `normalizePerlDevdocs`.
4. Replace the `rust-docs` known queries with API symbols whose URLs depend on
   upstream case.
5. Add unit tests for both repairs.
6. Regenerate `rust-docs` and `perl-docs` bundles.
7. Re-audit live result URLs across every catalog language.
8. Add `enterkeyhint="enter"` to the query input and an end-to-end assertion.

## Verification

- `python3 scripts/verify.py`
- `npm run test:live -- --source rust-docs --source perl-docs`
- Broad `<language> <keyword>` result-URL audit across all catalog languages.

## Open Issues

- The keyboard enter key colour cannot be confirmed without a physical iPhone.
