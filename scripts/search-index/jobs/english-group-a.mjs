import { extractHtmlLinks, uniqueRecords } from "../../search-index.mjs";
import {
  devdocsJob,
  linkRecords
} from "../job-helpers.mjs";
import { cppreferenceJob } from "../cppreference-job.mjs";
import {
  findExDocSidebarUrl,
  normalizeBashDevdocs,
  normalizeDocumenterSearchIndex,
  normalizeExDocSidebar,
  normalizePerlDevdocs,
  normalizeSitemap,
  titleFromUrl
} from "../english-group-a-parsers.mjs";

export const englishGroupAJobs = [
  cppreferenceJob({
    sourceId: "cppreference-c",
    programmingLanguage: "c",
    sourceKind: "community",
    sourceName: "cppreference C",
    docsLocale: "en",
    origin: "https://en.cppreference.com/",
    namespacePrefix: "c",
    urlPrefix: "https://en.cppreference.com/c/",
    minimumRecords: 600,
    knownQueries: ["atomic", "type support", "qsort"],
    attribution: "cppreference content; CC BY-SA 3.0 and GFDL.",
    licenseUrl: "https://en.cppreference.com/Cppreference:Copyright/CC-BY-SA"
  }),
  cppreferenceJob({
    sourceId: "cppreference-cpp",
    programmingLanguage: "cpp",
    sourceKind: "community",
    sourceName: "cppreference C++",
    docsLocale: "en",
    origin: "https://en.cppreference.com/",
    namespacePrefix: "cpp",
    urlPrefix: "https://en.cppreference.com/cpp/",
    minimumRecords: 6_000,
    knownQueries: ["ranges", "concepts library", "std::sort"],
    attribution: "cppreference content; CC BY-SA 3.0 and GFDL.",
    licenseUrl: "https://en.cppreference.com/Cppreference:Copyright/CC-BY-SA"
  }),
  {
    sourceId: "bash-manual",
    programmingLanguage: "bash",
    docsLocale: "en",
    adapter: "devdocs-original-url-map",
    sourceKind: "official",
    sourceName: "Bash Reference Manual",
    upstreamVersion: "GNU Bash 5.3 maintainer copy via DevDocs",
    urlPrefix: "https://tiswww.case.edu/php/chet/bash/bashref.html",
    minimumRecords: 480,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Shell Parameter Expansion", "Conditional Constructs"],
    attribution:
      "GNU Bash Reference Manual © Free Software Foundation; GNU Free Documentation License.",
    licenseUrl:
      "https://tiswww.case.edu/php/chet/bash/bashref.html#GNU-Free-Documentation-License",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const index = JSON.parse(
        await fetchText("https://documents.devdocs.io/bash/index.json")
      );
      const documents = JSON.parse(
        await fetchText("https://documents.devdocs.io/bash/db.json")
      );
      return normalizeBashDevdocs(index, documents, {
        sourceId: "bash-manual",
        programmingLanguage: "bash",
        sourceKind: "official",
        sourceName: "Bash Reference Manual",
        baseUrl: "https://tiswww.case.edu/php/chet/bash/bashref.html"
      });
    }
  },
  sitemapJob({
    sourceId: "clojure-docs",
    programmingLanguage: "clojure",
    sourceKind: "official",
    sourceName: "Clojure Reference",
    inputUrl: "https://clojure.org/sitemap.xml",
    upstreamVersion: "Clojure site rolling",
    urlPrefix: "https://clojure.org/",
    urlPrefixes: [
      "https://clojure.org/reference/",
      "https://clojure.org/guides/",
      "https://clojure.org/api/"
    ],
    minimumRecords: 60,
    knownQueries: ["reader", "java interop"],
    attribution: "Clojure documentation © Rich Hickey and contributors; EPL-1.0.",
    licenseUrl: "https://clojure.org/community/license"
  }),
  {
    sourceId: "elixir-docs",
    programmingLanguage: "elixir",
    docsLocale: "en",
    adapter: "exdoc-sidebar",
    upstreamVersion: "Elixir 1.20.1",
    urlPrefix: "https://hexdocs.pm/elixir/1.20.1/",
    minimumRecords: 2_300,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["GenServer", "pattern matching"],
    attribution: "Elixir documentation © Elixir contributors; Apache-2.0.",
    licenseUrl: "https://github.com/elixir-lang/elixir/blob/v1.20.1/LICENSE",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const baseUrl = "https://hexdocs.pm/elixir/1.20.1/";
      const pageUrl = `${baseUrl}Kernel.html`;
      const html = await fetchText(pageUrl);
      const sidebarUrl = findExDocSidebarUrl(html, pageUrl, baseUrl);
      return normalizeExDocSidebar(await fetchText(sidebarUrl), {
        sourceId: "elixir-docs",
        programmingLanguage: "elixir",
        sourceKind: "official",
        sourceName: "Elixir Documentation",
        baseUrl,
        section: "Elixir"
      });
    }
  },
  htmlLinksJob({
    sourceId: "erlang-docs",
    programmingLanguage: "erlang",
    sourceKind: "official",
    sourceName: "Erlang/OTP Documentation",
    inputUrl: "https://www.erlang.org/doc/man_index.html",
    upstreamVersion: "Erlang/OTP 29.0.3",
    urlPrefix: "https://www.erlang.org/doc/",
    minimumRecords: 500,
    knownQueries: ["gen_server", "supervisor"],
    attribution: "Erlang/OTP documentation © Ericsson AB; Apache-2.0.",
    licenseUrl: "https://github.com/erlang/otp/blob/OTP-29.0.3/LICENSE.txt"
  }),
  htmlLinksJob({
    sourceId: "groovy-docs",
    programmingLanguage: "groovy",
    sourceKind: "official",
    sourceName: "Groovy Documentation",
    inputUrl:
      "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/index.html?ModPagespeed=off",
    linkBaseUrl:
      "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/index.html",
    upstreamVersion: "Apache Groovy 5.0.7",
    urlPrefix:
      "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/",
    minimumRecords: 1_000,
    knownQueries: ["closures", "metaprogramming"],
    attribution: "Apache Groovy documentation © The Apache Software Foundation; Apache-2.0.",
    licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0"
  }),
  {
    sourceId: "julia-docs",
    programmingLanguage: "julia",
    docsLocale: "en",
    adapter: "documenter-search-index",
    upstreamVersion: "Julia v1 stable documentation",
    urlPrefix: "https://docs.julialang.org/en/v1/",
    minimumRecords: 3_500,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["multiple dispatch", "broadcast"],
    attribution: "Julia documentation © Julia contributors; MIT.",
    licenseUrl: "https://github.com/JuliaLang/julia/blob/master/LICENSE.md",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeDocumenterSearchIndex(
        await fetchText("https://docs.julialang.org/en/v1/search_index.js"),
        {
          sourceId: "julia-docs",
          programmingLanguage: "julia",
          sourceKind: "official",
          sourceName: "Julia Documentation",
          baseUrl: "https://docs.julialang.org/en/v1/",
          section: "Julia manual"
        }
      )
  },
  htmlLinksJob({
    sourceId: "lua-manual",
    programmingLanguage: "lua",
    sourceKind: "official",
    sourceName: "Lua Reference Manual",
    inputUrl: "https://www.lua.org/manual/5.5/contents.html",
    upstreamVersion: "Lua 5.5",
    urlPrefix: "https://www.lua.org/manual/5.5/",
    minimumRecords: 200,
    knownQueries: ["metatables", "coroutines"],
    attribution: "Lua 5.5 Reference Manual © Lua.org, PUC-Rio; Lua license.",
    licenseUrl: "https://www.lua.org/license.html"
  }),
  {
    sourceId: "perl-docs",
    programmingLanguage: "perl",
    docsLocale: "en",
    adapter: "devdocs-perl",
    upstreamVersion: "Perl 5.42.0 via DevDocs",
    urlPrefix: "https://perldoc.perl.org/",
    minimumRecords: 1_400,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["map", "perlre"],
    attribution: "Perl documentation © Perl contributors; Artistic License 1.0 or GPL-1.0-or-later.",
    licenseUrl: "https://dev.perl.org/licenses/",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizePerlDevdocs(
        JSON.parse(
          await fetchText("https://documents.devdocs.io/perl~5.42/index.json")
        ),
        {
          sourceId: "perl-docs",
          programmingLanguage: "perl",
          sourceKind: "official",
          sourceName: "Perl Documentation",
          baseUrl: "https://perldoc.perl.org/"
        }
      )
  },
  {
    sourceId: "r-manuals",
    programmingLanguage: "r",
    docsLocale: "en",
    adapter: "html-manual-list",
    upstreamVersion: "R release manuals rolling",
    urlPrefix: "https://cran.r-project.org/doc/",
    minimumRecords: 20,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["R intro", "R exts"],
    attribution: "R manuals © The R Core Team; GPL-2.0-or-later.",
    licenseUrl: "https://www.r-project.org/Licenses/",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const inputUrl = "https://cran.r-project.org/manuals.html";
      return linkRecords(extractHtmlLinks(await fetchText(inputUrl)), inputUrl)
        .filter((entry) => entry.url.startsWith("https://cran.r-project.org/doc/"))
        .filter((entry) => entry.url.endsWith(".html"))
        .map((entry) => ({
          ...entry,
          title: `${titleFromUrl(entry.url)} — ${releaseChannel(entry.url)}`
        }));
    }
  },
  htmlLinksJob({
    sourceId: "zig-docs",
    programmingLanguage: "zig",
    sourceKind: "official",
    sourceName: "Zig Documentation",
    inputUrl: "https://ziglang.org/documentation/master/",
    upstreamVersion: "Zig master rolling",
    urlPrefix: "https://ziglang.org/documentation/master/",
    minimumRecords: 650,
    knownQueries: ["comptime", "error unions"],
    attribution: "Zig documentation © Zig contributors; MIT.",
    licenseUrl: "https://github.com/ziglang/zig/blob/master/LICENSE"
  }),
  htmlLinksJob({
    sourceId: "haxe-manual",
    programmingLanguage: "haxe",
    sourceKind: "official",
    sourceName: "Haxe Manual",
    inputUrl: "https://haxe.org/manual/introduction.html",
    upstreamVersion: "Haxe Manual rolling",
    urlPrefix: "https://haxe.org/manual/",
    minimumRecords: 300,
    knownQueries: ["abstract", "macros"],
    attribution: "Haxe Manual © Haxe Foundation and contributors; CC BY 4.0.",
    licenseUrl: "https://haxe.org/manual/introduction-license.html"
  }),
  htmlLinksJob({
    sourceId: "nim-docs",
    programmingLanguage: "nim",
    sourceKind: "official",
    sourceName: "Nim Documentation",
    inputUrl: "https://nim-lang.org/docs/lib.html",
    upstreamVersion: "Nim stable documentation rolling",
    urlPrefix: "https://nim-lang.org/docs/",
    minimumRecords: 180,
    knownQueries: ["asyncdispatch", "macros"],
    attribution: "Nim documentation © Nim contributors; MIT.",
    licenseUrl: "https://github.com/nim-lang/Nim/blob/devel/copying.txt"
  }),
  sitemapJob({
    sourceId: "ocaml-docs",
    programmingLanguage: "ocaml",
    sourceKind: "official",
    sourceName: "OCaml Documentation",
    inputUrl: "https://ocaml.org/sitemap.xml",
    upstreamVersion: "OCaml.org documentation rolling",
    urlPrefix: "https://ocaml.org/docs",
    urlPrefixes: ["https://ocaml.org/docs"],
    minimumRecords: 60,
    knownQueries: ["tour of ocaml", "installing ocaml"],
    attribution: "OCaml.org documentation © OCaml contributors; CC BY-SA 4.0.",
    licenseUrl: "https://github.com/ocaml/ocaml.org/blob/main/LICENSE"
  }),
  sitemapJob({
    sourceId: "crystal-docs",
    programmingLanguage: "crystal",
    sourceKind: "official",
    sourceName: "Crystal Reference",
    inputUrl: "https://crystal-lang.org/reference/latest/sitemap.xml",
    upstreamVersion: "Crystal Reference 1.21",
    urlPrefix: "https://crystal-lang.org/reference/",
    urlPrefixes: ["https://crystal-lang.org/reference/"],
    minimumRecords: 140,
    knownQueries: ["concurrency", "macros"],
    attribution: "Crystal Reference contributors; CC0 1.0.",
    licenseUrl: "https://github.com/crystal-lang/crystal-book/blob/master/LICENSE"
  }),
  {
    sourceId: "d-docs",
    programmingLanguage: "d",
    docsLocale: "en",
    adapter: "html-link-index",
    upstreamVersion: "D language and Phobos latest",
    urlPrefix: "https://dlang.org/",
    minimumRecords: 600,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["templates", "algorithm"],
    attribution: "D documentation © D Language Foundation and contributors; BSL-1.0.",
    licenseUrl: "https://github.com/dlang/dlang.org/blob/master/LICENSE.txt",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const inputs = [
        "https://dlang.org/spec/spec.html",
        "https://dlang.org/phobos/index.html"
      ];
      const records = [];
      for (const inputUrl of inputs) {
        records.push(
          ...linkRecords(
            extractHtmlLinks(await fetchText(inputUrl)),
            inputUrl,
            inputUrl.startsWith("https://dlang.org/spec/")
              ? "https://dlang.org/spec/"
              : "https://dlang.org/phobos/"
          )
        );
      }
      return uniqueRecords(records);
    }
  }
];

function htmlLinksJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    adapter: "html-link-index",
    upstreamVersion: options.upstreamVersion,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      linkRecords(
        extractHtmlLinks(await fetchText(options.inputUrl)),
        options.linkBaseUrl ?? options.inputUrl,
        options.urlPrefix
      )
  };
}

function sitemapJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    adapter: "sitemap",
    upstreamVersion: options.upstreamVersion,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeSitemap(await fetchText(options.inputUrl), {
        sourceId: options.sourceId,
        programmingLanguage: options.programmingLanguage,
        sourceKind: options.sourceKind,
        sourceName: options.sourceName,
        urlPrefixes: options.urlPrefixes,
        section: options.sourceName
      })
  };
}

function releaseChannel(url) {
  return new URL(url).pathname.match(/\/manuals\/([^/]+)\//)?.[1] ?? "R manuals";
}
