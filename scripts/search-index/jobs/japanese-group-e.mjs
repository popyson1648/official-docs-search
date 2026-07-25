import { normalizeScopedHtmlLinks } from "../japanese-group-e-parsers.mjs";

export const japaneseGroupEJobs = [
  htmlTocJob({
    sourceId: "cppreference-c",
    programmingLanguage: "c",
    docsLocale: "ja",
    sourceKind: "community",
    sourceName: "cppreference C",
    inputUrl: "https://ja.cppreference.com/c",
    upstreamVersion: "cppreference Japanese C rolling (partial translation)",
    qualification: "Partial Japanese community edition",
    urlPrefix: "https://ja.cppreference.com/c/",
    accept: ({ url }) => url.pathname !== "/c",
    minimumRecords: 38,
    knownQueries: ["動的メモリ管理", "アトミック操作"],
    attribution:
      "Partial Japanese community translation of cppreference; CC BY-SA 3.0 and GFDL.",
    licenseUrl: "https://ja.cppreference.com/Cppreference:Copyright/CC-BY-SA"
  }),
  htmlTocJob({
    sourceId: "cppreference-cpp",
    programmingLanguage: "cpp",
    docsLocale: "ja",
    sourceKind: "community",
    sourceName: "cppreference C++",
    inputUrl: "https://ja.cppreference.com/cpp",
    upstreamVersion: "cppreference Japanese C++ rolling (partial translation)",
    qualification: "Partial Japanese community edition",
    urlPrefix: "https://ja.cppreference.com/cpp/",
    accept: ({ url }) => url.pathname !== "/cpp",
    minimumRecords: 95,
    knownQueries: ["コンセプトライブラリ", "範囲ライブラリ"],
    attribution:
      "Partial Japanese community translation of cppreference; CC BY-SA 3.0 and GFDL.",
    licenseUrl: "https://ja.cppreference.com/Cppreference:Copyright/CC-BY-SA"
  }),
  htmlTocJob({
    sourceId: "go-docs",
    programmingLanguage: "go",
    docsLocale: "en",
    sourceKind: "official",
    sourceName: "Go Documentation",
    inputUrl: "https://go.dev/doc/",
    upstreamVersion: "Go language documentation rolling",
    urlPrefix: "https://go.dev/doc/",
    accept: ({ url }) => url.pathname !== "/doc" && url.pathname !== "/doc/",
    minimumRecords: 45,
    knownQueries: ["Effective Go", "fuzzing"],
    attribution: "Go documentation © The Go Authors; BSD-3-Clause.",
    licenseUrl: "https://github.com/golang/website/blob/master/LICENSE"
  })
];

function htmlTocJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: options.docsLocale,
    adapter: "scoped-html-toc",
    upstreamVersion: options.upstreamVersion,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    ...(options.qualification ? { qualification: options.qualification } : {}),
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeScopedHtmlLinks(await fetchText(options.inputUrl), {
        sourceId: options.sourceId,
        programmingLanguage: options.programmingLanguage,
        docsLocale: options.docsLocale,
        sourceKind: options.sourceKind,
        sourceName: options.sourceName,
        inputUrl: options.inputUrl,
        urlRoot: options.urlPrefix,
        accept: options.accept,
        section: options.sourceName
      })
  };
}
