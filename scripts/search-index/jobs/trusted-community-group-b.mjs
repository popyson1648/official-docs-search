import {
  assertZigGuideVersion,
  normalizeAdvancedRBookToc,
  normalizeTrustedRss,
  normalizeTrustedSitemap,
  sectionFromPath
} from "../trusted-community-group-b-parsers.mjs";

export const trustedCommunityGroupBJobs = [
  sitemapJob({
    sourceId: "elixir-school",
    programmingLanguage: "elixir",
    sourceKind: "community",
    sourceName: "Elixir School",
    inputUrl: "https://elixirschool.com/sitemap.xml",
    upstreamVersion: "Elixir School English lessons rolling",
    qualification:
      "Community-maintained course; official Elixir documentation remains authoritative.",
    urlPrefix: "https://elixirschool.com/en/lessons/",
    acceptUrl: () => true,
    sectionFromUrl: (url) => sectionFromPath(url, 2),
    minimumRecords: 50,
    knownQueries: ["Pattern Matching", "OTP Supervisors"],
    attribution: "Elixir School content © Elixir School contributors; Apache-2.0.",
    licenseUrl: "https://github.com/elixirschool/elixirschool/blob/main/LICENSE",
    updateFrequency: "weekly"
  }),
  sitemapJob({
    sourceId: "learn-you-a-haskell",
    programmingLanguage: "haskell",
    sourceKind: "community",
    sourceName: "Learn You a Haskell (community edition)",
    inputUrl: "https://learnyouahaskell.github.io/sitemap.xml",
    upstreamVersion: "Learn You a Haskell community edition rolling",
    qualification:
      "Community-maintained edition; official GHC documentation remains authoritative.",
    urlPrefix: "https://learnyouahaskell.github.io/",
    acceptUrl: (url) =>
      url.pathname.endsWith(".html") &&
      !new Set(["/faq.html", "/chapters.html"]).has(url.pathname),
    sectionFromUrl: () => "Learn You a Haskell",
    minimumRecords: 12,
    knownQueries: ["Higher Order Functions", "Monads"],
    attribution:
      "Learn You a Haskell community edition © Miran Lipovača and contributors; CC BY-NC-SA 3.0.",
    licenseUrl:
      "https://github.com/learnyouahaskell/learnyouahaskell.github.io/blob/main/LICENSE",
    updateFrequency: "monthly"
  }),
  {
    sourceId: "advanced-r",
    programmingLanguage: "r",
    docsLocale: "en",
    adapter: "bookdown-toc",
    sourceKind: "conventional",
    sourceName: "Advanced R, Second Edition",
    upstreamVersion: "Advanced R second edition rolling",
    qualification: "Advanced second-edition book; not an introductory R course.",
    urlPrefix: "https://adv-r.hadley.nz/",
    minimumRecords: 30,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Metaprogramming", "Functionals"],
    attribution: "Advanced R, Second Edition © Hadley Wickham; CC BY-NC-SA 4.0.",
    licenseUrl: "https://adv-r.hadley.nz/#license",
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeAdvancedRBookToc(await fetchText("https://adv-r.hadley.nz/"), {
        urlPrefix: "https://adv-r.hadley.nz/"
      })
  },
  sitemapJob({
    sourceId: "clojure-guides",
    programmingLanguage: "clojure",
    sourceKind: "community",
    sourceName: "Clojure Guides",
    inputUrl: "https://clojure-doc.org/sitemap.xml",
    upstreamVersion: "Clojure Guides rolling",
    qualification:
      "Community guide; the official Clojure reference remains authoritative.",
    urlPrefix: "https://clojure-doc.org/articles/",
    acceptUrl: () => true,
    sectionFromUrl: (url) => sectionFromPath(url, 1),
    minimumRecords: 30,
    knownQueries: ["Namespaces", "Concurrency And Parallelism"],
    attribution:
      "Clojure Guides content © its respective primary authors; CC BY 3.0.",
    licenseUrl: "https://clojure-doc.org/articles/about/#license",
    updateFrequency: "monthly"
  }),
  rssJob({
    sourceId: "fsharp-for-fun-and-profit",
    programmingLanguage: "fsharp",
    sourceKind: "conventional",
    sourceName: "F# for Fun and Profit",
    inputUrl: "https://fsharpforfunandprofit.com/index.xml",
    upstreamVersion: "F# for Fun and Profit rolling",
    qualification:
      "Titles and links only; site text is copyrighted and is not openly relicensed.",
    urlPrefix: "https://fsharpforfunandprofit.com/",
    acceptUrl: (url) => {
      const first = url.pathname.split("/").filter(Boolean)[0];
      return Boolean(first) &&
        !new Set([
          "about",
          "archives",
          "categories",
          "search",
          "subscribe",
          "tags"
        ]).has(first);
    },
    sectionFromUrl: (url) => sectionFromPath(url, 0),
    minimumRecords: 180,
    knownQueries: ["F# syntax in 60 seconds", "dependency cycle"],
    attribution:
      "Article titles and links from F# for Fun and Profit © Scott Wlaschin; text and images all rights reserved.",
    licenseUrl: "https://fsharpforfunandprofit.com/about/license/",
    updateFrequency: "monthly"
  }),
  sitemapJob({
    sourceId: "zig-guide",
    programmingLanguage: "zig",
    sourceKind: "conventional",
    sourceName: "zig.guide",
    inputUrl: "https://zig.guide/sitemap.xml",
    versionPageUrl: "https://zig.guide/",
    expectedVersion: "0.15.2",
    upstreamVersion: "zig.guide for Zig 0.15.2",
    qualification:
      "Covers Zig 0.15.2; newer Zig releases may differ and official documentation remains authoritative.",
    urlPrefix: "https://zig.guide/",
    acceptUrl: (url) => {
      const first = url.pathname.split("/").filter(Boolean)[0];
      return Boolean(first) && first !== "posts" && !/^0\.\d+$/.test(first);
    },
    sectionFromUrl: (url) => sectionFromPath(url, 0),
    minimumRecords: 60,
    knownQueries: ["Comptime", "Errors"],
    attribution: "zig.guide content © zig.guide contributors; MIT.",
    licenseUrl: "https://github.com/sobeston/zig.guide/blob/master/LICENSE",
    updateFrequency: "weekly"
  })
];

function sitemapJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    adapter: "trusted-community-sitemap",
    sourceKind: options.sourceKind,
    sourceName: options.sourceName,
    upstreamVersion: options.upstreamVersion,
    qualification: options.qualification,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: options.updateFrequency,
    load: async ({ fetchText }) => {
      if (options.versionPageUrl && options.expectedVersion) {
        assertZigGuideVersion(
          await fetchText(options.versionPageUrl),
          options.expectedVersion
        );
      }
      return normalizeTrustedSitemap(await fetchText(options.inputUrl), {
        label: options.sourceName,
        urlPrefix: options.urlPrefix,
        acceptUrl: options.acceptUrl,
        sectionFromUrl: options.sectionFromUrl
      });
    }
  };
}

function rssJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    adapter: "trusted-community-rss",
    sourceKind: options.sourceKind,
    sourceName: options.sourceName,
    upstreamVersion: options.upstreamVersion,
    qualification: options.qualification,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: options.updateFrequency,
    load: async ({ fetchText }) =>
      normalizeTrustedRss(await fetchText(options.inputUrl), {
        label: options.sourceName,
        urlPrefix: options.urlPrefix,
        acceptUrl: options.acceptUrl,
        sectionFromUrl: options.sectionFromUrl
      })
  };
}
