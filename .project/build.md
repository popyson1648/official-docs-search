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

The build runs `npm run generate:pse-config` first.

## Run

Run the local development server:

```sh
npm run dev
```

The production build uses the Astro Node adapter in standalone server mode.
Google Programmable Search results require `PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX`.

## Common Failures

- Missing `PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX`: the app renders setup links instead of Google results.
- TOML catalog errors: check `src/data/docs-sources.toml`.
- Google Programmable Search setup issues: upload `public/search/context.xml` and `public/search/annotations.xml` in the Google control panel.
