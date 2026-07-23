# Plan

## Goal

Make search results reliably visible and functional on desktop and mobile, make source and locale controls affect the actual search, and add mandatory browser-level verification for every supported user-facing behavior branch.

## Scope

- Correct the Google Programmable Search configuration and page integration so results use an inline Results only layout.
- Apply documentation-result locale selection to Google searches and keep it separate from UI language selection.
- Add explicit loading, no-results, provider-failure, and configuration-missing states instead of leaving a blank results area.
- Add deterministic end-to-end browser tests using a controlled Google Search Element fixture.
- Add focused unit and integration tests for query generation, source selection, locale restrictions, and generated XML.
- Enable end-to-end verification in `.project/verification.toml`, local pre-commit verification, and CI.
- Update project documentation, templates, and decision history for the new verification policy and Google layout requirements.
- Regenerate `public/search/context.xml`, `public/search/annotations.xml`, and related catalog outputs.

## Non-goals

- Replacing Google Programmable Search with another provider.
- Using the paid Custom Search JSON API.
- Treating a Google CAPTCHA or DOM container as a successful search result.
- Treating fixture-backed browser tests as proof that the live Google engine returns results.
- Merging the branch automatically.

## Assumptions

- Google Programmable Search remains the production provider.
- The generated context file will be uploaded to the existing Google control-panel engine after the repository change is verified.
- A representative test for every behavior branch is the maintainable meaning of full functional coverage; testing every keyword against Google's changing index is neither deterministic nor exhaustive.
- Existing unrelated working-tree changes will be preserved.

## Steps

1. Record the verification-policy and Google layout/locale decisions under `.decisions/`.
2. Correct the generated Google context configuration:
   - use the documented Results only layout (`element_layout="7"`)
   - keep the query-parameter name consistent with the application
   - add regression assertions for the generated XML
3. Correct the page integration:
   - render results inline without overlay CSS workarounds
   - pass UI language to the Google element language (`hl`)
   - pass Docs locale as the Google result-language restriction (`lr=lang_en` or `lr=lang_ja`)
   - expose deterministic loading, success, empty, CAPTCHA/provider-error, and missing-CX states
4. Build a deterministic browser-test fixture that simulates the documented Google Search Element contract without making live Google requests.
5. Add browser E2E coverage for these user-visible flows:
   - empty initial page and search submission
   - single-language query returning titled, linked results from the selected official domain
   - language aliases and code-syntax search text
   - multiple-language query returning results from each selected language domain
   - official-only default behavior
   - enabling non-official sources and receiving a result from the added source
   - selecting and deselecting individual trusted sources
   - Docs locale All, EN, and JA changing the result-language restriction and fixture results
   - UI language EN and JA changing application copy and Google element language independently
   - cookie persistence for source mode, Docs locale, and UI language
   - language-tag removal, help dialog, and validation errors
   - pagination while preserving the processed query and filters
   - loading, no-results, provider failure, CAPTCHA/challenge, and missing-CX feedback
   - visible inline results with non-zero dimensions at desktop and mobile widths
6. Add unit/integration matrix coverage for all catalog entries so every configured domain/path, source kind, language ID/alias, and locale declaration is validated.
7. Add the E2E command to package scripts and enable it in `.project/verification.toml`; keep `.pre-commit-config.yaml`, `.github/workflows/ci.yml`, and their templates aligned.
8. Update `.project/` documentation with the exact verification commands, deterministic/live-test boundary, and Google control-panel upload procedure.
9. Run full verification, review desktop/mobile screenshots from the deterministic fixture, and review the final diff for regressions and unrelated changes.
10. Provide the regenerated `context.xml` for control-panel upload and perform a human live-search checklist after the Google engine has accepted it.
11. Add a separate live smoke test that uses the configured production CX, requires at least one semantic result for known indexed queries, validates returned domains, and fails on zero results, timeout, or CAPTCHA.
12. Run the live smoke matrix after each Google configuration upload and do not report search as working unless it passes.

## Verification

- `python3 scripts/verify.py`
- The verification script must run typecheck, build, unit tests, integration tests, and deterministic browser E2E tests.
- E2E assertions must check real result semantics in the fixture: non-empty title, allowed URL, expected domain/source, expected language restriction, and visible bounding box.
- E2E tests must run at desktop and mobile viewport sizes.
- Generated XML tests must assert Results only layout and matching query-parameter configuration.
- Manual live checklist after control-panel upload:
  - one language + keyword
  - multiple languages + keyword
  - non-official source enabled
  - Docs locale EN and JA
  - desktop and mobile result visibility
- `npm run test:live` after every Google control-panel change; all representative searches must return at least one result and an allowed result URL.

## Open Issues

- Updating the live Google engine requires an authenticated control-panel upload; repository changes alone cannot replace that external step.
- Google can show CAPTCHA challenges. A challenge is a failed/inconclusive live verification, never a passing result; it must be rerun from an ordinary browser/network before completion is reported.
