# Index Sources

## Collection Policy

Store only titles or headings, optional section labels, and original HTTPS URLs.
Do not store or republish documentation bodies.
Make the generated manifest the canonical per-source inventory for input and
output hashes, validators, retrieval time, versions, attribution, licenses,
cadence, known queries, counts, and sizes.

Fetch only reviewed static indexes, tables of contents, sitemaps, or structured
metadata with an identifying user agent, bounded concurrency, timeouts, and
retries.
Do not discovery-crawl or use upstream search endpoints.
If a reviewed navigation page contains request-specific decoration, define and
test a named canonical metadata projection and record its name in the manifest.
Record the robots and terms review date and any host-specific crawl delay.
Treat aggregators as acquisition intermediaries, not replacements for
underlying licenses.

## Supported Input Families

Keep this document short by grouping supported indexes that share an adapter
and collection policy.
List every exact source-locale entry in the generated manifest.

| Family | Supported indexes | Collection rule |
| --- | --- | --- |
| Static search metadata | List sources and locales. | State the exact artifact and no-crawl rule. |
| Structured navigation | List sources and locales. | State the TOC, sitemap, or package-list boundary. |
| Localized editions | List sources and locales. | Require actual localized titles and URLs. |
| Conventional/community | List sources and locales. | Preserve source kind and edition qualifications. |

For trusted teaching sources, record why the author or steward is credible,
the reviewed static input boundary, and any age, version, scope, stewardship,
or license qualification.
Store the qualification in both English and Japanese and render it in the
source picker and result metadata.

## Locale Qualifications

List maintained exact-locale bundles and document partial, stale,
machine-translated, community, or rejected locale candidates.
Never duplicate or relabel English metadata as another locale.

## Blocked And Replacement Sources

For every blocked or disabled source that affects language coverage, record the
terms, stability, or distribution reason and name the reviewed replacement when
one exists.

Update job metadata, this policy, its project copy, and generated artifacts
together when an input, version, license, attribution, cadence, qualification,
or robots rule changes.
