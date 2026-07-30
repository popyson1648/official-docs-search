# Project Guide

## What This Project Is

LangRef Search is an Astro 7 server-rendered application for searching trusted programming-language documentation.
It provides supported search coverage for all 44 catalog languages through
compact source-and-locale indexes and searches selected bundles in a browser Web Worker.
The production domain is `official-docs-search.popyson.com`.

## Where To Start

- Application entry point: `src/pages/index.astro`
- Browser controllers and worker: `src/client/`
- Framework-independent catalog, query, and search logic: `src/core/`
- Documentation source catalog: `src/data/docs-sources.toml`
- Index adapters and generation: `scripts/generate-search-index.mjs`
- Source-family index jobs and parsers: `scripts/search-index/`
- Generated federated search indexes: `public/search-index/`
- Production server: `scripts/serve-production.mjs`
- Unit, integration, server-contract, and browser tests: `tests/`

## Minimum Setup

1. Install dependencies with `npm install`.
2. Start local development with `npm run dev`.
3. Run verification with `python3 scripts/verify.py`.

Use `npm run update:search-index` only when intentionally refreshing committed index artifacts.
Use `npm run build && npm start` to exercise the production compression and cache contract.

## Related Documents

- Build: `.project/build.md`
- Structure: `.project/structure.md`
- Testing: `.project/testing.md`
- Index sources and usage policy: `.project/index-sources.md`
- Performance and transfer model: `.project/performance.md`
- Release: `.project/release.md`
- Verification config: `.project/verification.toml`
