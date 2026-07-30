# Plan

## Goal

Finish the binary proposal-source toggle, apply `#825CFF` as the site theme color, and render external-result arrows consistently without emoji substitution.

## Scope

- Keep the proposal-source control strictly binary: on when any proposal source is selected and off when none are selected.
- Replace the current blue, yellow, and neutral interface palette with a cohesive purple palette anchored at `#825CFF`.
- Preserve the current perceived-lightness hierarchy while changing hue.
- Use the exact theme color for the Search button, enabled toggle tracks, and selected generic filters.
- Use clearly purple-tinted light surfaces for source cards, segmented controls, and filter UI.
- Keep search-result title/body text black.
- Keep semantic error red and catalog language colors unchanged.
- Add browser theme metadata and update the favicon to the theme color.
- Place the supplied logo in the page heading without modifying the source image.
- Publish the supplied OGP image for Open Graph and Twitter large-image cards.
- Replace the generated SVG favicon with the supplied PNG icon.
- Use `LangRef Search` as the service, visible heading, metadata, and structured-data name.
- Add localized English and Japanese titles and descriptions that explain the service's official-documentation search purpose.
- Expose English and Japanese home variants at `?ui=en` and `?ui=ja` with reciprocal `hreflang`, same-language canonical URLs, and an `x-default` home URL.
- Use the request's `Accept-Language` only as the first-visit fallback after explicit URL and saved preferences.
- Add `WebSite` structured data, robots metadata for internal search-result URLs, and crawlable sitemap/robots endpoints.
- Optimize supplied raster assets for their delivery role and declare intrinsic dimensions to avoid layout shift.
- Replace text-character external arrows with inline SVG icons in search results and the source picker.
- Update visual, interaction, and accessibility tests and short project documentation.

## Non-goals

- Do not recolor language identity tags.
- Do not alter result ranking, source selection, indexes, or upstream URLs.
- Do not introduce a dark theme.
- Do not add language-, source-, or proposal-specific landing pages; the current
  top page remains the only product entry point.
- Do not add About, methodology, privacy, or other explanatory pages or sections.
- Do not perform external community outreach, directory submissions, or backlink
  campaigns.
- Do not otherwise change the current page structure, search workflow, or
  interaction model.
- Do not modify unrelated generated-index work already in the worktree.

## Assumptions

- “Keep the darkness” means retaining the existing visual lightness steps for backgrounds, borders, secondary text, and controls while moving their hue toward the theme purple.
- `#825CFF` is the canonical accent and browser theme color even where its exact lightness differs from the old blue accent.
- Search-result headings and primary result text retain the existing near-black value.
- The production origin is `https://official-docs-search.popyson.com`.
- Search engines control final titles, snippets, and language selection; the implementation supplies their documented canonical, language, and metadata signals without claiming guaranteed placement.

## Steps

1. Define purple theme tokens and separate result-text tokens where black must remain.
2. Apply the exact accent to Search, enabled toggles, and selected filters; apply stronger light-purple surfaces to cards and filter controls.
3. Produce right-sized, compressed public derivatives of the supplied logo, OGP, and icon assets while preserving their appearance.
4. Replace the visible page-heading text with a responsive logo presentation, explicit dimensions, and a localized accessible heading.
5. Rename the service to `LangRef Search` and add localized title, description, Open Graph, Twitter, canonical, `hreflang`, and `WebSite` structured metadata.
6. Add explicit-language first-visit negotiation plus focused robots and sitemap discovery for the English/Japanese home variants.
7. Switch the favicon and touch icon to optimized derivatives of the supplied icon.
8. Replace text arrows with reusable inline SVG external-link icons.
9. Update unit/E2E/server assertions for binary proposal selection, palette values, assets, metadata, language negotiation, black result text, and non-emoji arrow markup.
10. Verify desktop and mobile screenshots, contrast, layout shift, transferred image bytes, overflow, and configured repository checks.

## Verification

- Run type checking, unit tests, production build, filter/layout E2E tests, and server contract tests.
- Compare computed lightness of old and new non-accent palette levels within a small tolerance.
- Inspect Japanese and English pages at desktop and 375 CSS-pixel mobile widths.
- Confirm external-link icons contain SVG paths and no emoji/text glyph.
- Confirm the logo remains legible without overlap and social-image URLs resolve to the published OGP asset.
- Confirm English/Japanese URLs render matching `html lang`, title, description, canonical, and reciprocal `hreflang` values.
- Confirm direct first visits select JA for Japanese `Accept-Language` and EN for English or unmatched languages without overriding explicit URLs or saved preferences.
- Confirm optimized page-loaded image bytes do not regress the existing performance budget.

## Open Issues

- None.
