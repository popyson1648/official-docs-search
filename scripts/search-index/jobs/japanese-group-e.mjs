import { normalizeSitemap } from "../english-group-a-parsers.mjs";
import { normalizeScopedHtmlLinks } from "../japanese-group-e-parsers.mjs";
import { cppreferenceJob } from "../cppreference-job.mjs";

export const japaneseGroupEJobs = [
  cppreferenceJob({
    sourceId: "cppreference-c",
    programmingLanguage: "c",
    docsLocale: "ja",
    sourceKind: "community",
    sourceName: "cppreference C",
    origin: "https://ja.cppreference.com/",
    namespacePrefix: "c",
    qualification: "Partial Japanese community edition",
    urlPrefix: "https://ja.cppreference.com/c/",
    minimumRecords: 500,
    knownQueries: ["動的メモリ管理", "アトミック操作"],
    attribution:
      "Partial Japanese community translation of cppreference; CC BY-SA 3.0 and GFDL.",
    licenseUrl: "https://ja.cppreference.com/Cppreference:Copyright/CC-BY-SA"
  }),
  {
    sourceId: "cpprefjp",
    programmingLanguage: "cpp",
    docsLocale: "ja",
    adapter: "sitemap",
    upstreamVersion: "cpprefjp rolling",
    urlPrefix: "https://cpprefjp.github.io/",
    minimumRecords: 5_000,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["ranges_sort", "sort", "vector"],
    attribution: "cpprefjp contributors; CC BY 4.0.",
    licenseUrl: "https://github.com/cpprefjp/site/blob/master/LICENSE",
    qualification: "Japanese community reference",
    qualificationJa: "日本語コミュニティによるリファレンス",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeSitemap(
        await fetchText("https://cpprefjp.github.io/sitemap.xml"),
        {
          sourceId: "cpprefjp",
          programmingLanguage: "cpp",
          docsLocale: "ja",
          sourceKind: "community",
          sourceName: "cpprefjp",
          urlPrefixes: [
            "https://cpprefjp.github.io/lang/",
            "https://cpprefjp.github.io/reference/"
          ],
          section: "cpprefjp"
        }
      )
  },
  cppreferenceJob({
    sourceId: "cppreference-cpp",
    programmingLanguage: "cpp",
    docsLocale: "ja",
    sourceKind: "community",
    sourceName: "cppreference C++",
    origin: "https://ja.cppreference.com/",
    namespacePrefix: "cpp",
    qualification: "Partial Japanese community edition",
    urlPrefix: "https://ja.cppreference.com/cpp/",
    minimumRecords: 3_800,
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
