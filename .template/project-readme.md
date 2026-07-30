# Project Guide

## What This Project Is

Official Docs Search is an Astro 7 server-rendered application for searching trusted programming-language documentation.
It provides supported search coverage for all catalog languages through compact
source-and-locale indexes and searches selected bundles in a browser Web Worker.

## Where To Start

- Application entry point: `src/pages/index.astro`
- Browser controllers and worker: `src/client/`
- Framework-independent logic: `src/core/`
- Documentation source catalog: `src/data/docs-sources.toml`
- Index adapters and generation: `scripts/generate-search-index.mjs`
- Source-family index jobs and parsers: `scripts/search-index/`
- Generated indexes: `public/search-index/`
- Production runtime: Cloudflare Workers via `@astrojs/cloudflare` and
  `wrangler.jsonc`
- Verification: `tests/` and `scripts/verify.py`

## Minimum Setup

1. Install dependencies with `npm install`.
2. Start local development with `npm run dev`.
3. Run verification with `python3 scripts/verify.py`.

Use `npm run update:search-index` only for intentional artifact refreshes.
Use `npm run build && npm start` to exercise production delivery behavior.

## Related Documents

- Build: `.project/build.md`
- Structure: `.project/structure.md`
- Testing: `.project/testing.md`
- Index sources and usage policy: `.project/index-sources.md`
- Performance and transfer model: `.project/performance.md`
- Release: `.project/release.md`
- Verification config: `.project/verification.toml`
