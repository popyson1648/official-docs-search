# Decision

## Title

Use the source catalog as the canonical index-support contract

## Date

2026-07-23

## Status

Accepted

## Decision

Keep source identity, programming language, source kind, allowed URL scope,
documentation-site locales, and per-locale search-index status in
`src/data/docs-sources.toml`.

Represent every configured source locale as one of:

- `supported`: a generated bundle must exist.
- `planned`: an adapter is intended but not yet available.
- `blocked`: indexing is currently prevented, with a reason.
- `disabled`: indexing is intentionally turned off, with a reason.

Generate the browser manifest from this catalog and the verified adapter inputs.
The manifest contains the complete status projection for the browser, while only
supported entries contain a content-addressed bundle path and bundle metadata.
Keep adapter-specific parsing and URL-construction code in the generator instead
of encoding executable behavior in TOML.

Treat the catalog as the source of truth and the manifest as a deterministic
projection.
Contract tests require exact source/locale agreement in both directions.

## Context

The catalog previously used one `locales` field for documentation-site support.
The browser inferred search support from whether a source and locale happened to
appear in `public/search-index/manifest.json`.
Generator jobs repeated source names, kinds, languages, and locales in code and
generated bundles.
This made planned, blocked, disabled, and accidentally missing indexes
indistinguishable.

## Alternatives

- Keep support implicit in generated files: rejected because missing artifacts
  cannot be distinguished from intentional unsupported states.
- Maintain a second hand-written index catalog: rejected because identity and
  locale metadata would drift.
- Put executable adapter configuration entirely in TOML: rejected because
  source-specific parsing still needs reviewed code and typed tests.

## Reason

One declarative source catalog makes every unsupported state reviewable and lets
the generator, browser, and tests share the same contract.
Separating site locales from index status prevents the UI from promising a
searchable locale merely because the upstream website provides it.

## Consequences

- Every source locale must have an explicit index status.
- Adding a supported status requires a tested adapter and generated bundle in the
  same change.
- Generated bundles carry compact records and stable identifiers; browser display
  metadata comes from the generated manifest projection.
- Status labels are localized in English and Japanese; concise catalog reasons
  provide the technical detail when a non-supported state needs explanation.

## Revisit Conditions

- The catalog becomes too large for a concise TOML source of truth.
- Adapter policy needs a separate schema with independent ownership.
- Search support becomes dynamic rather than release-time generated.
