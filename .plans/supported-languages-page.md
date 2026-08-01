# Plan

## Goal

Let a visitor confirm which programming languages and sources LangRef Search
covers, without opening the Sources filter and reading 82 checkboxes.

## Scope

- Add `/languages`, an ancillary page rendered from the catalog.
- List every catalog language with its sources, each source's kind, document
  kind, original link, and which locales are indexed.
- Name the sources that are not indexed yet and why, using the catalog's own
  status and reason.
- Link the page from the site footer in both languages.
- Serve it with the same shell, theming, and locale behavior as the legal pages.

## Non-goals

- A second search entry point. The page links to the home page and offers no
  search field.
- Record counts or index sizes, which live in the manifest rather than the
  catalog and would pull a large JSON into the Worker bundle.
- Changing the catalog, the search behavior, or the Sources filter.

## Assumptions

- `src/data/docs-sources.toml` is the single source of truth for coverage, so a
  page generated from `loadCatalog()` can never drift from what the search uses.
- The page is ancillary, so it stays `noindex,follow` and out of the sitemap,
  matching the Terms and Privacy pages. Making it indexable is a one-line change
  if the operator wants the search traffic.

## Steps

1. Rename `LegalLayout` to `AncillaryLayout` and widen its `pathname` union, so
   the shared shell no longer claims to be legal-only.
2. Add the localized strings the page needs.
3. Add `src/pages/languages.astro`, grouping catalog languages and marking the
   locales each source indexes.
4. Link the page from `SiteFooter`.
5. Cover the page in the workerd contract test: both locales, every catalog
   language present, `noindex`, absent from the sitemap, and the footer link.
6. Update `.project/structure.md`.

## Verification

- `python3 scripts/verify.py --mode ci --full`.
- Render `/languages` in both locales and both themes at desktop and mobile
  widths.
- Compare the rendered language count with the catalog's.

## Open Issues

- None.
