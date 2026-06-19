# Build

## Prerequisites

- Node.js compatible with Astro 6.
- npm.

## Setup

Run:

```sh
npm install
```

## Build

Run:

```sh
npm run build
```

## Run

Run the local development server:

```sh
npm run dev
```

The production build uses the Astro Node adapter in standalone server mode.

## Common Failures

- Missing search provider credentials: the app falls back to catalog preview results.
- TOML catalog errors: check `src/data/docs-sources.toml`.
- Source filtering issues: verify source domains and path prefixes.
