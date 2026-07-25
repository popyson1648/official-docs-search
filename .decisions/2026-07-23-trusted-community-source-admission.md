# Decision

## Title

Admit trusted non-official sources with visible qualifications

## Date

2026-07-23

## Status

Accepted

## Decision

Add a non-official source only when it has an identifiable author or steward,
useful current coverage, a stable reviewed index input, and reviewable reuse or
site terms.
Store only titles or headings, optional section labels, and direct HTTPS URLs.
Every admitted source receives a lower source-kind ranking than official
documentation and remains behind `source:all`.

When age, version, scope, stewardship, or reuse terms could change how a reader
should use a source, record the qualification in English and Japanese.
Show it in the source picker and alongside matching results.

## Context

Official references are authoritative but often do not provide a progressive
explanation, practical examples, or production-oriented guidance.
The user requested TypeScript Deep Dive and similarly reliable resources for
other languages, while asking that material concerns be stated explicitly.

## Alternatives

- Add every popular tutorial found for all catalog languages.
- Link non-official sources without indexing them.
- Add the sources but keep qualifications only in maintainer documentation.

## Reason

A selective admission gate adds high-value teaching material without implying
that popularity is authority.
Metadata-only indexing limits copied content and lets source-specific licenses
remain controlling.
Visible bilingual qualifications give users the context needed to distinguish
a classic guide, a version-specific course, a specialized cookbook, or a
metadata-only index from current official documentation.

## Consequences

- Eighteen reviewed English sources are admitted in this change.
- Six useful but narrower or less current candidates remain deferred.
- English-only sources truthfully fall back from Japanese requests and remain
  labeled `EN`.
- Source adapters must declare attribution, license URL, update cadence, known
  queries, minimum counts, and change gates.
- Terms, input paths, versions, and qualifications require review when they
  change.

## Revisit Conditions

- The source becomes stale, archived, unreachable, or misleading for current
  language versions.
- Its license, terms, robots policy, ownership, or index endpoint changes.
- A clearly better maintained source supersedes it.
- The qualification no longer describes the source accurately.
