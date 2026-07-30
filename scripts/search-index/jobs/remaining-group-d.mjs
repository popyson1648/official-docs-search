import {
  normalizeDartdocIndex,
  normalizeDoccNavigator,
  normalizeElmGuideIndex,
  normalizeElmPackages,
  normalizeHtmlToc,
  normalizePrettySphinxIndex,
  normalizeSitemap
} from "../parsers-group-d.mjs";
import {
  normalizeSphinxEntries,
  parseSphinxSearchIndex
} from "../../search-index.mjs";

const jobs = [];
const KOTLIN_INTERNAL_TEST_PAGE =
  "https://kotlinlang.org/docs/test-page.html";

jobs.push({
  sourceId: "swift-docs",
  programmingLanguage: "swift",
  docsLocale: "en",
  adapter: "docc-navigator",
  upstreamVersion: "The Swift Programming Language 6.4 beta",
  urlPrefix: "https://docs.swift.org/swift-book/",
  minimumRecords: 40,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["Concurrency", "Generics"],
  attribution: "The Swift Programming Language © Apple Inc. and Swift contributors; Apache 2.0.",
  licenseUrl: "https://github.com/swiftlang/swift-book/blob/main/LICENSE.txt",
  updateFrequency: "weekly",
  load: async ({ fetchText }) =>
    normalizeDoccNavigator(
      await fetchText("https://docs.swift.org/swift-book/index/index.json"),
      { urlPrefix: "https://docs.swift.org/swift-book/" }
    )
});

jobs.push({
  sourceId: "kotlin-docs",
  programmingLanguage: "kotlin",
  docsLocale: "en",
  adapter: "sitemap",
  upstreamVersion: "Kotlin documentation rolling sitemap",
  urlPrefix: "https://kotlinlang.org/docs/",
  minimumRecords: 350,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["Coroutines", "Multiplatform"],
  attribution: "Kotlin documentation © JetBrains and contributors; Apache 2.0.",
  licenseUrl: "https://github.com/JetBrains/kotlin-web-site/blob/master/LICENSE",
  updateFrequency: "weekly",
  load: async ({ fetchText }) =>
    normalizeSitemap(await fetchText("https://kotlinlang.org/docs/sitemap.xml"), {
      fallbackTitle: "Kotlin Documentation",
      acceptUrl: (url) =>
        url.startsWith("https://kotlinlang.org/docs/") &&
        url !== KOTLIN_INTERNAL_TEST_PAGE
    })
});

for (const docsLocale of ["en", "ja"]) {
  const urlPrefix =
    docsLocale === "ja"
      ? "https://docs.scala-lang.org/ja/"
      : "https://docs.scala-lang.org/";
  const sourceId = docsLocale === "ja" ? "scala-docs-ja" : "scala-docs";
  jobs.push({
    sourceId,
    programmingLanguage: "scala",
    docsLocale,
    adapter: "html-top-level-toc",
    upstreamVersion:
      docsLocale === "ja"
        ? "Scala documentation Japanese partial edition"
        : "Scala documentation rolling",
    ...(docsLocale === "ja"
      ? { qualification: "Partial Japanese community translation" }
      : {}),
    urlPrefix,
    minimumRecords: docsLocale === "ja" ? 8 : 30,
    maximumRecordDropRatio: 0.3,
    maximumSizeChangeRatio: 0.5,
    knownQueries: docsLocale === "ja" ? ["Scala ツアー", "チートシート"] : ["Tour of Scala", "Scala 3 Book"],
    attribution:
      docsLocale === "ja"
        ? "Scala documentation Japanese community translation © its contributors. Titles and direct links only; the documentation repository declares no separate reuse license."
        : "Scala documentation © Scala Center and contributors. Titles and direct links only; the documentation repository declares no separate reuse license.",
    licenseUrl: "https://www.scala-lang.org/license/",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeHtmlToc(await fetchText(urlPrefix), {
        inputUrl: urlPrefix,
        preferLast: docsLocale === "ja",
        acceptUrl: (url) =>
          docsLocale === "ja"
            ? url.href.startsWith(urlPrefix) && url.pathname !== "/ja/"
            : url.hostname === "docs.scala-lang.org" &&
              !url.pathname.startsWith("/ja/") &&
              url.pathname !== "/"
      })
  });
}

jobs.push({
  sourceId: "dart-docs",
  programmingLanguage: "dart",
  docsLocale: "en",
  adapter: "sitemap",
  upstreamVersion: "Dart documentation rolling sitemap",
  urlPrefix: "https://dart.dev/",
  minimumRecords: 250,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["Language", "Effective Dart"],
  attribution: "Dart documentation © Dart project contributors; BSD-3-Clause.",
  licenseUrl: "https://github.com/dart-lang/site-www/blob/main/LICENSE",
  updateFrequency: "weekly",
  load: async ({ fetchText }) =>
    normalizeSitemap(await fetchText("https://dart.dev/sitemap.xml"), {
      fallbackTitle: "Dart Documentation",
      acceptUrl: (url) =>
        [
          "/language",
          "/libraries",
          "/guides",
          "/tools",
          "/effective-dart"
        ].some((prefix) => new URL(url).pathname.startsWith(prefix))
    })
});

jobs.push({
  sourceId: "dart-api",
  programmingLanguage: "dart",
  docsLocale: "en",
  adapter: "dartdoc-index",
  upstreamVersion: "Dart API rolling",
  urlPrefix: "https://api.dart.dev/",
  minimumRecords: 5_000,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["dart:async.Future", "dart:core.String"],
  attribution: "Dart API documentation © Dart project contributors; BSD-3-Clause.",
  licenseUrl: "https://github.com/dart-lang/sdk/blob/main/LICENSE",
  updateFrequency: "weekly",
  load: async ({ fetchText }) =>
    normalizeDartdocIndex(await fetchText("https://api.dart.dev/index.json"), {
      urlPrefix: "https://api.dart.dev/"
    })
});

jobs.push({
  sourceId: "haskell-ghc-users-guide",
  programmingLanguage: "haskell",
  docsLocale: "en",
  adapter: "sphinx",
  upstreamVersion: "GHC latest User's Guide",
  urlPrefix: "https://downloads.haskell.org/ghc/latest/docs/users_guide/",
  minimumRecords: 1_000,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["Using GHC", "profiling"],
  attribution: "GHC User's Guide © The GHC Team; BSD-3-Clause.",
  licenseUrl:
    "https://downloads.haskell.org/ghc/latest/docs/users_guide/intro.html#the-glasgow-haskell-compiler-license",
  updateFrequency: "monthly",
  load: async ({ fetchText }) => {
    const urlPrefix = "https://downloads.haskell.org/ghc/latest/docs/users_guide/";
    return normalizeSphinxEntries(
      parseSphinxSearchIndex(await fetchText(`${urlPrefix}searchindex.js`)),
      {
        sourceId: "haskell-ghc-users-guide",
        programmingLanguage: "haskell",
        docsLocale: "en",
        sourceKind: "official",
        sourceName: "GHC User's Guide",
        buildUrl: (path, fragment) =>
          `${urlPrefix}${path}.html${fragment ? `#${encodeURIComponent(fragment)}` : ""}`
      }
    );
  }
});

jobs.push({
  sourceId: "fortran-lang",
  programmingLanguage: "fortran",
  docsLocale: "en",
  adapter: "sphinx-pretty-url",
  upstreamVersion: "Fortran Lang rolling English",
  urlPrefix: "https://fortran-lang.org/learn/",
  minimumRecords: 2_000,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["Quickstart tutorial", "Best Practices"],
  attribution: "Fortran Lang documentation © Fortran community contributors; MIT.",
  licenseUrl: "https://github.com/fortran-lang/webpage/blob/main/LICENSE",
  updateFrequency: "weekly",
  load: async ({ fetchText }) =>
    normalizePrettySphinxIndex(
      await fetchText("https://fortran-lang.org/searchindex.js"),
      {
        sourceId: "fortran-lang",
        programmingLanguage: "fortran",
        docsLocale: "en",
        sourceKind: "conventional",
        sourceName: "Fortran Lang",
        urlPrefix: "https://fortran-lang.org/"
      }
    ).filter((record) => record.url.startsWith("https://fortran-lang.org/learn/"))
});

jobs.push({
  sourceId: "elm-guide",
  programmingLanguage: "elm",
  docsLocale: "en",
  adapter: "gitbook-search-index",
  upstreamVersion: "Elm Guide rolling",
  urlPrefix: "https://guide.elm-lang.org/",
  minimumRecords: 35,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["The Elm Architecture", "Custom Types"],
  attribution:
    "Elm Guide © Evan Czaplicki and contributors; CC BY-NC-ND 4.0.",
  licenseUrl: "https://github.com/evancz/guide.elm-lang.org/blob/master/LICENSE",
  updateFrequency: "monthly",
  load: async ({ fetchText }) =>
    normalizeElmGuideIndex(
      await fetchText("https://guide.elm-lang.org/search_index.json"),
      { urlPrefix: "https://guide.elm-lang.org/" }
    )
});

jobs.push({
  sourceId: "elm-packages",
  programmingLanguage: "elm",
  docsLocale: "en",
  adapter: "elm-package-index",
  upstreamVersion: "Elm package catalog rolling",
  urlPrefix: "https://package.elm-lang.org/packages/",
  minimumRecords: 2_900,
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5,
  knownQueries: ["elm/core", "elm/json"],
  attribution: "Elm package catalog metadata; individual package licenses apply.",
  licenseUrl: "https://package.elm-lang.org/help/design-guidelines",
  updateFrequency: "weekly",
  load: async ({ fetchText }) =>
    normalizeElmPackages(
      await fetchText("https://package.elm-lang.org/all-packages"),
      { urlPrefix: "https://package.elm-lang.org/packages/" }
    )
});

jobs.push(
  htmlTocJob({
    sourceId: "racket-docs",
    programmingLanguage: "racket",
    inputUrl: "https://docs.racket-lang.org/",
    urlPrefix: "https://docs.racket-lang.org/",
    minimumRecords: 1_200,
    knownQueries: ["The Racket Reference", "Guide"],
    upstreamVersion: "Racket documentation rolling manuals",
    attribution: "Racket documentation © Racket contributors; Apache 2.0 or MIT.",
    licenseUrl: "https://docs.racket-lang.org/license/index.html",
    allowIndexPages: true
  })
);

for (const docsLocale of ["en", "ja"]) {
  const version = docsLocale === "ja" ? "8.0" : "8.4";
  const urlPrefix = `https://dev.mysql.com/doc/refman/${version}/${docsLocale}/`;
  const inputUrl =
    `https://docs.oracle.com/cd/E17952_01/mysql-${version}-${docsLocale}/index.html`;
  jobs.push(
    htmlTocJob({
      sourceId: "mysql-docs",
      programmingLanguage: "sql",
      docsLocale,
      inputUrl,
      linkBaseUrl: urlPrefix,
      urlPrefix,
      minimumRecords: 1_250,
      knownQueries:
        docsLocale === "ja"
          ? ["SQL ステートメント", "バックアップとリカバリ"]
          : ["SQL Statements", "Backup and Recovery"],
      upstreamVersion:
        docsLocale === "ja"
          ? "MySQL 8.0 Japanese machine-translated manual"
          : "MySQL 8.4 Reference Manual",
      ...(docsLocale === "ja"
        ? {
            qualification:
              "Machine-translated MySQL 8.0 edition; English index is MySQL 8.4"
          }
        : {}),
      attribution:
        docsLocale === "ja"
          ? "MySQL 8.0 Japanese machine-translated Reference Manual © Oracle."
          : "MySQL 8.4 Reference Manual © Oracle.",
      licenseUrl: `${urlPrefix}preface.html`
    })
  );
}

jobs.push(
  htmlTocJob({
    sourceId: "sqlite-docs",
    programmingLanguage: "sql",
    inputUrl: "https://www.sqlite.org/docs.html",
    urlPrefix: "https://www.sqlite.org/",
    minimumRecords: 100,
    knownQueries: ["SQL Syntax", "Query Planner"],
    upstreamVersion: "SQLite documentation rolling",
    attribution: "SQLite documentation; public domain.",
    licenseUrl: "https://www.sqlite.org/copyright.html"
  })
);

export const remainingGroupDJobs = jobs;

function htmlTocJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: options.docsLocale ?? "en",
    adapter: "html-toc",
    upstreamVersion: options.upstreamVersion,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    ...(options.qualification ? { qualification: options.qualification } : {}),
    updateFrequency: options.updateFrequency ?? "weekly",
    load: async ({ fetchText }) =>
      normalizeHtmlToc(await fetchText(options.inputUrl), {
        inputUrl: options.linkBaseUrl ?? options.inputUrl,
        acceptUrl: (url) =>
          url.href.startsWith(options.urlPrefix) &&
          !url.pathname.endsWith("/") &&
          (options.allowIndexPages || !url.pathname.endsWith("/index.html"))
      })
  };
}
