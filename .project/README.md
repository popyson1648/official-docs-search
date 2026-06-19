# Project Guide

## What This Project Is

Official Docs Search is a server-rendered Astro application for searching trusted programming-language documentation sources.
The production domain is `official-docs-search.popyson.com`.

## Where To Start

- Application entry point: `src/pages/index.astro`
- Framework-independent logic: `src/core/`
- Documentation source catalog: `src/data/docs-sources.toml`
- Generated Google Programmable Search config: `public/search/`
- Unit tests: `tests/`

## Minimum Setup

1. Install dependencies with `npm install`.
2. Start local development with `npm run dev`.
3. Run verification with `python3 scripts/verify.py`.

## Related Documents

- Build: `.project/build.md`
- Structure: `.project/structure.md`
- Testing: `.project/testing.md`
- Verification config: `.project/verification.toml`
