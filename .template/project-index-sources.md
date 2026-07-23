# Index Sources

## Collection Policy

Store only titles or headings, optional section labels, and original HTTPS URLs.
Do not store or republish documentation bodies.
Record exact inputs, hashes, validators, retrieval time, versions, attribution, and license links in the generated manifest.

Fetch only reviewed public static inputs with an identifying user agent, bounded timeout, and bounded retry count.
Do not discovery-crawl or use upstream search endpoints.
Record the robots review date, re-check rules and terms before changing endpoints, and stop if access becomes disallowed.
Treat aggregation services as acquisition intermediaries, not replacements for underlying licenses.

## Supported Inputs

Maintain one row for every supported source-and-locale index.

| Index | Input and adapter | License and required attribution | Update and robots policy |
| --- | --- | --- | --- |
| `python-docs/en` | DevDocs Python 3.14 index; `devdocs` | PSF License; attribute the Python Software Foundation. | Weekly; one index fetch, no docs crawl. |
| `python-docs/ja` | Official Japanese Sphinx index; `sphinx` | PSF License; attribute the Python Software Foundation. | Weekly; one allowed static index fetch. |
| `rust-docs/en` | DevDocs Rust index; `devdocs` | Apache-2.0 or MIT; attribute The Rust Project Developers. | Weekly; one index fetch, no docs crawl. |
| `tc39-ecma262/en` | Public specification root; `ecmarkup` | Follow Ecma copyright and terms; attribute Ecma International. | Weekly; one page fetch, no site crawl. |
| `mdn-js/en` | DevDocs JavaScript index; `devdocs` | CC BY-SA 2.5 or later; attribute Mozilla contributors. | Weekly; one index fetch, no MDN crawl. |
| `typescript-docs/en` | DevDocs TypeScript index; `devdocs` | CC BY 4.0; attribute Microsoft and credit adapted DevDocs metadata. | Weekly; one index fetch, no docs crawl. |
| `go-std/en` | DevDocs Go index mapped to versioned package links; `devdocs` | BSD-3-Clause; attribute The Go Authors and credit adapted DevDocs metadata. | Monthly; do not scrape package or search routes. |
| `java-docs/en` | Two static Oracle Javadoc indexes; `javadoc-types` | Oracle copyright, all rights reserved; metadata and links only. | Monthly; no Oracle search route. |
| `csharp-docs/en` | Pinned `dotnet/docs` C# TOC; `yaml-toc` | CC BY 4.0; attribute Microsoft. | Weekly; pinned raw file, no Learn crawl. |
| `php-manual/en` | Public English function index; `php-manual-index` | CC BY 3.0 or later; attribute PHP Documentation Group. | Weekly; no `/search.php`. |
| `php-manual/ja` | Public Japanese function index; `php-manual-index` | CC BY 3.0 or later; attribute PHP Documentation Group. | Weekly; no `/search.php`. |
| `ruby-docs/en` | Static Ruby table of contents; `rdoc-toc` | Ruby License and component terms; attribute Ruby contributors. | Weekly; static page only. |
| `ruby-docs/ja` | Four static Japanese reference indexes; `ruby-reference-index` | CC BY 3.0; attribute the Japanese Ruby Reference Manual. | Weekly; static pages only. |

Update generator metadata, this policy, and generated artifacts together when an input, version, license, attribution, cadence, or robots rule changes.
