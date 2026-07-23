# Index Sources

## Collection Policy

Store only titles or headings, optional section labels, and original HTTPS URLs.
Do not store or republish documentation bodies.
`public/search-index/manifest.json` records the exact input URL, SHA-256, available `ETag` and `Last-Modified`, retrieval time, output hash, version, attribution, and license URL for every supported index.

Fetch only the listed public static inputs with the project user agent, a 30-second timeout, and at most two attempts.
Do not perform discovery crawling or use upstream search endpoints.
Robots rules were reviewed on 2026-07-23; re-check them and the site terms before adding or moving an endpoint, and stop generation if access becomes disallowed.
DevDocs is an acquisition intermediary for its listed inputs, not a replacement for the underlying documentation license.

## Supported Inputs

| Index | Input and adapter | License and required attribution | Update and robots policy |
| --- | --- | --- | --- |
| `python-docs/en` | DevDocs Python 3.14 `index.json`; `devdocs` | © Python Software Foundation; PSF License. | Weekly. Fetch the one DevDocs file; do not crawl Python pages. |
| `python-docs/ja` | `docs.python.org/ja/3/searchindex.js`; `sphinx` | © Python Software Foundation; PSF License. | Weekly. Fetch the public Sphinx index only; its path is not disallowed. |
| `rust-docs/en` | DevDocs Rust `index.json`; `devdocs` | © The Rust Project Developers; Apache-2.0 or MIT. | Weekly. Fetch the one DevDocs file; do not crawl Rust pages. |
| `tc39-ecma262/en` | `tc39.es/ecma262/`; `ecmarkup` headings | © Ecma International; follow the copyright and terms linked by the manifest. | Weekly. Fetch the public specification root once; no site crawl. |
| `mdn-js/en` | DevDocs JavaScript `index.json`; `devdocs` | © Mozilla contributors; CC BY-SA 2.5 or later. | Weekly. Fetch the one DevDocs file; do not crawl MDN or its search routes. |
| `typescript-docs/en` | DevDocs TypeScript `index.json`; `devdocs`, restricted to `/docs/` | © Microsoft; CC BY 4.0. Credit DevDocs for adapted index metadata. | Weekly. Fetch the one DevDocs file; do not crawl typescriptlang.org. |
| `go-std/en` | DevDocs Go `index.json`; `devdocs`, mapped to versioned `pkg.go.dev` links | © The Go Authors; BSD-3-Clause. Credit DevDocs for adapted index metadata. | Monthly. Fetch the one DevDocs file; do not scrape `pkg.go.dev` or its search/fetch routes. |
| `java-docs/en` | Oracle Java SE 25 `package-search-index.js` and `type-search-index.js`; `javadoc-types` | Java SE/JDK API documentation © Oracle and/or its affiliates; all rights reserved. Store metadata and direct links only. | Monthly. Fetch only the two static Javadoc indexes; do not use Oracle `/search/`. |
| `csharp-docs/en` | Pinned `dotnet/docs` C# `toc.yml` at commit `b2bd326ace411a28756f9f2e93e21ff289840a56`; `yaml-toc` | © Microsoft; CC BY 4.0. | Weekly. Fetch the pinned raw GitHub file; do not crawl Learn pages. |
| `php-manual/en` | `php.net/manual/en/indexes.functions.php`; `php-manual-index` | © PHP Documentation Group; CC BY 3.0 or later. | Weekly. Fetch the public manual index only; do not use `/search.php`. |
| `php-manual/ja` | `php.net/manual/ja/indexes.functions.php`; `php-manual-index` | © PHP Documentation Group; CC BY 3.0 or later. | Weekly. Fetch the public manual index only; do not use `/search.php`. |
| `ruby-docs/en` | Ruby 3.4 `table_of_contents.html`; `rdoc-toc` | © Ruby contributors; Ruby License and component-specific licenses. | Weekly. Fetch the static table of contents only; current robots rules do not disallow it. |
| `ruby-docs/ja` | Ruby 3.4 Japanese class, function, library, and document index pages; `ruby-reference-index` | Japanese Ruby Reference Manual; CC BY 3.0. | Weekly. Fetch only the four static index pages; current robots rules do not disallow them. |

The manifest license URL is the canonical link presented for each generated index.
Any license, attribution, input, version, cadence, or robots-policy change must update the generator metadata, this document, its template, and the generated manifest in one reviewed change.
