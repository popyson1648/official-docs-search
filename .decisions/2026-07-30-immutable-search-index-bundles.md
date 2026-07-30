# Decision

## Title

Publish content-addressed search bundles under an immutable directory

## Date

2026-07-30

## Status

Accepted

## Decision

Search bundles are published to `public/search-index/bundles/` and served with
`Cache-Control: public, max-age=31536000, immutable`. Both `manifest.json` and
`runtime-manifest.json` stay in `public/search-index/` with Cloudflare's default
revalidated asset policy.

## Context

Bundle filenames already contain a 16-character hash of their contents, so a
given URL never changes. They were nevertheless served with the default
`max-age=0, must-revalidate`, which makes every new page session revalidate each
bundle it loads. Cloudflare applies all matching `_headers` rules and joins
duplicate header values with a comma, and the file has no exclusion syntax, so a
rule covering `/search-index/*` cannot exempt the manifests.

## Alternatives

- Add an immutable rule for `/search-index/*`: also freezes the manifests, which
  are the only way a client learns about new bundles.
- Detach `Cache-Control` for the manifests with `! Cache-Control`: leaves them
  with no directive and relies on undocumented interaction between detaching and
  setting the same header.
- Configure a zone-level Cache Rule with a path exclusion: expressive, but moves
  a delivery guarantee out of the repository into dashboard state.
- Leave the default policy: keeps a revalidation round trip per bundle per
  session for artifacts that are provably immutable.

## Reason

Separating immutable artifacts from their mutable index is the same contract
Astro already uses for `/_astro/`, keeps the policy declarative in
`public/_headers`, and makes the caching rule obvious from the URL. Future
content-addressed artifacts inherit it by being published to the same directory.

## Consequences

- `scripts/search-index-generator.mjs` emits `/search-index/bundles/<file>`
  paths, and the publisher stages, renames, and prunes nested artifact names.
- Repeat visits fetch only the manifests before searching cached bundles.
- Both manifests must keep pointing at bundle paths; a manifest served with a
  stale immutable policy would pin clients to retired bundles.
- Verification enumerates published artifacts recursively.

## Revisit Conditions

Revisit if bundles stop being content-addressed, if Cloudflare adds exclusion
support to `_headers`, or if the manifests themselves become content-addressed.
