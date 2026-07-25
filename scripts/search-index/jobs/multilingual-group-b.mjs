import {
  normalizeJavadocTypes,
  normalizeMdnSearchIndex,
  normalizeSoliditySphinxSearchIndex
} from "../parsers-group-b.mjs";

const MDN_LICENSE_URL =
  "https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license";
const MDN_ATTRIBUTION = "MDN content © Mozilla contributors; CC BY-SA 2.5 or later.";

function mdnJob({
  sourceId,
  programmingLanguage,
  docsLocale,
  path,
  minimumRecords,
  knownQueries
}) {
  const siteLocale = docsLocale === "ja" ? "ja" : "en-US";
  const urlPrefix = `https://developer.mozilla.org/${siteLocale}/docs/${path}`;
  return {
    sourceId,
    programmingLanguage,
    docsLocale,
    adapter: "mdn-search-index",
    upstreamVersion: `MDN Web Docs ${siteLocale} rolling search index`,
    urlPrefix,
    minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries,
    attribution: MDN_ATTRIBUTION,
    licenseUrl: MDN_LICENSE_URL,
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeMdnSearchIndex(
        await fetchText(`https://developer.mozilla.org/${siteLocale}/search-index.json`),
        {
          sourceId,
          programmingLanguage,
          docsLocale,
          sourceKind: "conventional",
          sourceName: "MDN Web Docs",
          urlPrefix
        }
      )
  };
}

function solidityJob(docsLocale) {
  const urlPrefix = `https://docs.soliditylang.org/${docsLocale}/latest/`;
  const isJapanese = docsLocale === "ja";
  const sourceId = isJapanese ? "solidity-docs-ja" : "solidity-docs";
  return {
    sourceId,
    programmingLanguage: "solidity",
    docsLocale,
    adapter: "sphinx",
    upstreamVersion: `Solidity latest ${isJapanese ? "Japanese community translation" : "English"}`,
    ...(isJapanese
      ? { qualification: "Japanese community translation" }
      : {}),
    urlPrefix,
    minimumRecords: 500,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries:
      isJapanese
        ? ["スマートコントラクト", "マッピング型"]
        : ["smart contracts", "mapping types"],
    attribution:
      isJapanese
        ? "Solidity documentation Japanese community translation; GNU GPL v3.0."
        : "Solidity documentation © Solidity contributors; GNU GPL v3.0.",
    licenseUrl: "https://github.com/argotorg/solidity/blob/develop/LICENSE.txt",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeSoliditySphinxSearchIndex(await fetchText(`${urlPrefix}searchindex.js`), {
        sourceId,
        programmingLanguage: "solidity",
        docsLocale,
        sourceKind: isJapanese ? "community" : "official",
        sourceName: isJapanese
          ? "Solidity Documentation (Japanese community translation)"
          : "Solidity Documentation",
        urlPrefix
      })
  };
}

const javaJapaneseUrlPrefix = "https://docs.oracle.com/javase/jp/25/docs/api/";

export const multilingualGroupBJobs = [
  {
    sourceId: "java-docs",
    programmingLanguage: "java",
    docsLocale: "ja",
    adapter: "javadoc-types",
    upstreamVersion: "Java SE 25 Japanese",
    urlPrefix: javaJapaneseUrlPrefix,
    minimumRecords: 5_000,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["String", "List"],
    attribution:
      "Java SE 25 & JDK 25 Japanese API documentation © Oracle and/or its affiliates. All rights reserved.",
    licenseUrl: "https://docs.oracle.com/javase/jp/25/docs/legal/copyright.html",
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeJavadocTypes(
        await fetchText(`${javaJapaneseUrlPrefix}package-search-index.js`),
        await fetchText(`${javaJapaneseUrlPrefix}type-search-index.js`),
        { urlPrefix: javaJapaneseUrlPrefix }
      )
  },
  solidityJob("en"),
  solidityJob("ja"),
  mdnJob({
    sourceId: "mdn-js",
    programmingLanguage: "javascript",
    docsLocale: "ja",
    path: "Web/JavaScript",
    minimumRecords: 1_000,
    knownQueries: ["プロミス", "配列"]
  }),
  ...[
    {
      sourceId: "html-mdn",
      programmingLanguage: "html",
      path: "Web/HTML",
      minimumRecords: 240,
      knownQueries: {
        en: ["HTML elements", "input"],
        ja: ["ハイパーテキスト", "入力要素"]
      }
    },
    {
      sourceId: "css-mdn",
      programmingLanguage: "css",
      path: "Web/CSS",
      minimumRecords: 1_100,
      knownQueries: {
        en: ["display", "selectors"],
        ja: ["カスケーディング", "セレクター"]
      }
    },
    {
      sourceId: "wasm-mdn",
      programmingLanguage: "webassembly",
      path: "WebAssembly",
      minimumRecords: 40,
      knownQueries: {
        en: ["WebAssembly", "compile"],
        ja: ["WebAssembly", "テキスト形式"]
      }
    }
  ].flatMap((options) =>
    ["en", "ja"].map((docsLocale) =>
      mdnJob({
        ...options,
        docsLocale,
        knownQueries: options.knownQueries[docsLocale]
      })
    )
  )
];
