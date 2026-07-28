# Decision

## Title

Use flat subordinate links for grouped results and a contextual Top control

## Date

2026-07-28

## Status

Accepted

## Decision

Keep conservative result grouping, but render each grouped symbol as one
dominant heading followed by compact, borderless source links. Separate
top-level results with whitespace instead of repeated dividers.

Render source qualifications in a small, borderless details disclosure. Restore
the result-filter trigger to its original icon-only pill geometry.

On long pages, show a 44-by-44 CSS-pixel Top control at the safe-area-aware
bottom-right after the search panel leaves the viewport. Activation moves focus
to the page heading and scrolls to the top; reduced-motion preferences disable
its animation and smooth scrolling.

## Context

The first grouped-result design reduced duplicate titles but rendered every
source as a bordered card inside a result separated by another divider. On a
390-pixel viewport, a two-source `std::sort` group was about 228 pixels tall,
and the source cards competed visually with the group heading. The bordered
source-qualification disclosure was also larger than the main Sources
disclosure.

Google Search presents clustered links beneath one dominant result rather than
as nested cards. GitHub Code Search similarly subordinates destinations to the
result title. Atlassian uses grouping titles or dividers rather than combining
both, and GOV.UK uses details for short secondary content because it is less
prominent than larger disclosure components.

## Alternatives

- Keep source cards but reduce their padding and border contrast.
- Add a stronger outer card or divider around each complete result group.
- Show only one preferred source and hide alternative origins.
- Keep the enlarged visible-label filter trigger.
- Keep a permanently visible Top control.

## Reason

Removing nested surfaces fixes the hierarchy instead of merely shrinking the
same competing card pattern. Heading plus whitespace makes each result the sole
top-level unit, while source name, locale, source kind, section, and safe link
remain available as subordinate provenance.

A contextual Top control follows the floating scroll-action pattern used for
long pages without occupying the interface near the top, where it has no value.

## Consequences

- Grouped results are substantially shorter and contain no nested card borders.
- Source links use content-sized targets and rely on typography, indentation,
  and hover underlining rather than containers.
- Top-level results no longer have divider lines.
- The icon-only filter trigger is less visually explicit, but retains its
  localized accessible name and existing overlay behavior.
- The Top control requires client JavaScript for conditional visibility.

## Revisit Conditions

Revisit if usability observation shows that whitespace alone does not separate
groups, users cannot discover the icon-only result filter, source provenance is
hard to scan without containers, or the Top control obscures other fixed
actions.
