# Plan

## Goal

Make the supported-languages page easy to scan by showing every language name
in a compact list and revealing its documentation sources on demand.

## Scope

- Render each supported language as a collapsed disclosure control.
- Make the full language row the toggle target while preserving the existing
  language color tag.
- Reveal the existing source links and metadata when a language is opened.
- Keep the layout usable with a keyboard and at mobile widths.
- Update the supported-languages page contract test for the disclosure markup.

## Non-goals

- Changing the supported language catalog or source metadata.
- Adding global expand-all or collapse-all controls.
- Remembering disclosure state across visits.
- Changing search behavior or the language filters on the search page.

## Assumptions

- All language disclosures should be closed initially so visitors first see a
  concise list of names.
- Native `details` and `summary` elements provide the expected keyboard and
  assistive-technology behavior without page-specific JavaScript.

## Steps

1. Replace each language section with a native disclosure whose summary
   contains the language name.
2. Style the disclosures as compact, full-width rows with clear hover, focus,
   open, and dark-theme states.
3. Update the production-server test to assert one closed disclosure per
   catalog language while retaining the existing coverage checks.
4. Verify the repository and inspect the rendered page at desktop and mobile
   widths.

## Verification

- Run `python3 scripts/verify.py`.
- Confirm all catalog languages render as closed `details` elements.
- Confirm mouse and keyboard activation reveals the correct source list.
- Inspect Japanese and English pages at desktop and mobile widths.

## Open Issues

- None.
