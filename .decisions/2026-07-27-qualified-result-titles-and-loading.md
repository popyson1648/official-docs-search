# Decision

## Title

Qualified result titles and accessible skeleton loading

## Date

2026-07-27

## Status

Accepted

## Decision

Qualify API-like result titles with their verified namespace, module, package,
class, or type owner when structured upstream metadata or a reviewed URL shape
proves that ownership.
For repeated prose headings, append a concise section or URL-parent context only
when it distinguishes records.
Do not invent language identifiers from ambiguous prose.

During searches, visually hide the loading sentence, mark the result region
busy, and show four non-interactive result-card skeletons with a horizontal wave
and a centered activity indicator.
Disable both animations for reduced-motion preferences.
Place locale-fallback details before the successful result count.

## Context

cpprefjp exposed multiple results titled only `sort`, despite their URLs
identifying `std::sort`, `std::list::sort`, and
`std::forward_list::sort`.
Ruby, ExDoc, Javadoc, and several prose indexes had similar loss of owner or
document context.
The previous boxed loading sentence did not preview the structure being loaded
and displaced the result layout.

## Alternatives

- Keep leaf titles and rely on URL or section annotations.
- Qualify titles only at render time.
- Add a separate compact-record display-title field.
- Show only a spinner or only the boxed loading sentence.

## Reason

Adapter-time correction improves result titles, suggestions, search matching,
and every renderer without changing the compact schema.
Explicit source-family rules preserve language syntax, while the generic
fallback remains visibly contextual rather than pretending to be an API name.
Skeleton cards communicate the pending layout, and `aria-busy` plus the hidden
status text preserve assistive-technology feedback.

## Consequences

The shared title qualifier affects every source and therefore selects full
source verification, including GNU.
Content-addressed bundles change only where titles or refreshed upstream inputs
change.
Loading UI tests must cover desktop, mobile, reduced motion, vertical centering,
busy-state cleanup, and removal of stale skeletons.

## Revisit Conditions

Add a distinct stored display title only if search relevance and display naming
need conflicting representations.
Add a new source-family rule only when its ownership metadata or URL structure
is stable and tested.
Remove the centered indicator if measured usability shows that the wave
skeleton alone communicates progress more clearly.
