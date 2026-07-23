# Plan

## Goal

Complete every open task under `.tmp/issue/` by making the federated documentation
index secure, explicit, reproducible, efficient, extensible, and maintainable.

## Scope

- Resolve the production dependency advisories with compatible Astro and Node
  adapter versions.
- Separate documentation-site locale support from search-index support and make
  every catalog source's index status explicit.
- Make index generation deterministic, staged, atomic, non-destructive in check
  mode, and suitable for reviewed scheduled updates.
- Add content-addressed bundles, compression and cache verification, worker-based
  browser search, performance budgets, and a documented transfer-cost model.
- Add verified adapters for TypeScript, Go, Java, C#, PHP, and Ruby where public
  indexes can be stored and refreshed under documented upstream terms.
- Move browser-only search controls and rendering into typed, testable modules.
- Supersede obsolete Google-search decisions and remove confirmed dead code while
  preserving historical plans.
- Keep project documents, templates, local verification, and CI aligned.

## Non-goals

- General Web crawling or republishing complete documentation bodies.
- Automatically accepting large upstream index changes.
- Automatically merging an index-update pull request or this implementation.
- Removing user-owned local environment values or remote deployment settings
  without identifying the exact target and obtaining separate approval.
- Deleting historical plans solely because they describe an older architecture.

## Assumptions

- The existing uncommitted federated-index work is the baseline and must be
  preserved.
- `src/data/docs-sources.toml` is the canonical source for source identity,
  classification, locales, index status, and ingestion policy.
- Generated manifests are deterministic projections of catalog and adapter input,
  not a second manually maintained source of truth.
- A source that cannot currently be indexed is represented explicitly as planned,
  blocked, or disabled with a reason.
- Worktrees are not used until the uncommitted baseline is safely represented in
  Git; parallel work is limited to non-overlapping research, tests, and documents.

## Steps

1. Create and use `feature/resolve-search-index-issues`.
2. Verify current Astro migration and advisory guidance, update production
   dependencies explicitly, add production-start and escaping regressions, and
   make `npm audit --omit=dev` pass without forced audit rewrites.
3. Record the catalog/manifest ownership decision, model site locales and
   source/locale index states, and add bidirectional catalog-manifest contracts.
4. Refactor ingestion into catalog-driven adapters and a testable generator core.
   Stage every output, validate all bundles and change gates, then publish
   atomically. Add deterministic provenance, input/output hashes, explicit update
   and non-destructive check modes, and scheduled reviewed update pull requests.
5. Use content-addressed bundle paths and verify production gzip/Brotli,
   Cache-Control, ETag, and Vary behavior. Search compact tuples in a Web Worker,
   cache unchanged bundles, and retain only bounded top results.
6. Move query highlighting, cookies, locale controls, source persistence, dialog
   behavior, result rendering, and tag removal into typed modules with injected
   browser boundaries and unit tests.
7. Research and document public index endpoints, licenses, attribution, robots
   policy, versions, and update methods for TypeScript, Go, Java, C#, PHP, and
   Ruby. Add supported adapters and their generated bundles, minimum-count gates,
   known-query checks, allowed-URL checks, mixed-language tests, and locale tests.
8. Mark replaced Google decisions as superseded, remove confirmed obsolete
   runtime artifacts and unused code/styles/messages, and document how historical
   plans differ from current project state.
9. Update `.project/`, `.template/`, package scripts, verification configuration,
   pre-commit checks, and CI together.
10. Run the complete offline, live, production-server, security, performance, and
    cleanliness verification and review the final diff for correctness and risk.

## Verification

- `npm audit --omit=dev`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run test:live`
- Production standalone server smoke and cache/compression integration tests.
- Deterministic double-generation and staged-failure tests.
- Search-index size, Long Task, warm-search latency, and mixed-language tests.
- `git diff --check`
- Compare `git status --porcelain` before and after non-destructive checks.
- `python3 scripts/verify.py`

## Open Issues

- The deployment provider and project are not recorded, so remote removal of
  `PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX` needs separate target identification and
  approval.
- Hosting cost depends on the eventual provider, cache hit rate, selected
  languages, and geographic traffic; document formulas and representative
  scenarios, then replace assumptions when production telemetry exists.
- If upstream terms prohibit storing a requested index, record the source/locale
  as blocked with evidence instead of bypassing the restriction.
