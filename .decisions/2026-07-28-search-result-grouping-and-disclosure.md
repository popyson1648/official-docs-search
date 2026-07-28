# Decision

## Title

Group duplicate reference symbols and progressively disclose long result sets

## Date

2026-07-28

## Status

Accepted

## Decision

Group search records only when they are reference documents in the same
programming language, have the same conservatively normalized qualified symbol
title, and come from different source-and-locale origins. Keep every origin as a
visible link within the group. Preserve letter case because identifiers can be
case-sensitive, and do not apply Unicode normalization because compatibility or
canonical equivalents can still be distinct identifiers.

Render the first 15 groups and disclose later groups in batches of 15 with a
localized Load more button and live progress text. Keep the total group count
visible.

Move source qualifications that repeat across results into one collapsed
source-level section. Keep record-specific section text, proposal status, and
proposal warnings on their individual result.

Use user-facing catalog language names in badges, make the filter trigger a
visible 44 CSS-pixel control, localize Japanese labels, and do not show a generic
Japanese-availability notice before a query.

## Context

A `cpp sort` search returned 41 records and produced a mobile page around 9,000
CSS pixels tall. Equivalent symbols from cpprefjp and cppreference appeared as
separate adjacent results, while source qualifications repeated on every record.
The result badge exposed `cpp` instead of `C++`, several Japanese labels remained
English, and the icon-only filter control was only 34 by 32 CSS pixels.

## Alternatives

- Keep every record visible and add only a Back to top button.
- Use numbered server-side pagination.
- Group every exact title regardless of document kind or title shape.
- Remove alternative source links after selecting one preferred source.
- Keep source qualifications on every record.

## Reason

Client-side incremental disclosure preserves the current fast cached search and
filter workflow without introducing page navigation. Conservative grouping
reduces repetition while avoiding invented equivalence between ambiguous pages.
Keeping each source link preserves user choice and provenance.

## Consequences

- The visible result count represents groups rather than raw source documents.
- Tests that need a particular origin inspect nested source links as well as
  standalone result metadata.
- Deep results require an explicit Load more action.
- Source qualifications remain available but no longer dominate every result.
- Result grouping can expand later only when adapters provide stronger canonical
  identifiers.

## Revisit Conditions

Revisit if search indexes add canonical symbol identifiers, typical searches
exceed the 60-record runtime limit, analytics show users frequently need later
batches, or grouped source choice becomes harder to understand than separate
records.
