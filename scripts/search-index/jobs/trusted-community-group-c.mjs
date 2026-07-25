import {
  canonicalizeWebDevCourseInput,
  normalizeCommonLispCookbookIndex,
  normalizeCornellOcamlSearchIndex,
  normalizeProgrammingInDToc,
  normalizeSolidityByExampleSearch,
  normalizeWebDevCourse
} from "../trusted-community-group-c-parsers.mjs";

const SOLIDITY_SEARCH_URL =
  "https://raw.githubusercontent.com/Cyfrin/solidity-by-example.github.io/gh-pages/src/search.json";
const COMMON_LISP_INDEX_URL =
  "https://raw.githubusercontent.com/LispCookbook/cl-cookbook/master/index.md";

export const trustedCommunityGroupCJobs = [
  {
    sourceId: "programming-in-d",
    programmingLanguage: "d",
    docsLocale: "en",
    adapter: "programming-in-d-toc",
    sourceKind: "conventional",
    sourceName: "Programming in D",
    upstreamVersion: "Programming in D rolling",
    urlPrefix: "https://ddili.org/ders/d.en/",
    minimumRecords: 80,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Message Passing Concurrency", "Ranges"],
    attribution: "Programming in D © Ali Çehreli; CC BY-NC-SA 3.0 US.",
    licenseUrl: "https://ddili.org/copyright.html",
    qualification:
      "Community-authored tutorial; however, it may lag the latest D release.",
    updateFrequency: "monthly",
    load: async ({ fetchText }) => {
      const inputUrl = "https://ddili.org/ders/d.en/index.html";
      return normalizeProgrammingInDToc(await fetchText(inputUrl), {
        inputUrl,
        urlPrefix: "https://ddili.org/ders/d.en/",
        sourceId: "programming-in-d",
        programmingLanguage: "d",
        sourceKind: "conventional",
        sourceName: "Programming in D"
      });
    }
  },
  {
    sourceId: "cornell-ocaml",
    programmingLanguage: "ocaml",
    docsLocale: "en",
    adapter: "sphinx-page-index",
    sourceKind: "conventional",
    sourceName: "OCaml Programming: Correct + Efficient + Beautiful",
    upstreamVersion: "Cornell CS 3110 textbook rolling",
    urlPrefix: "https://cs3110.github.io/textbook/",
    minimumRecords: 100,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Pattern Matching", "Monads"],
    attribution:
      "OCaml Programming: Correct + Efficient + Beautiful © Cornell CS 3110 authors; CC BY-NC-ND 4.0.",
    licenseUrl: "https://github.com/cs3110/textbook/blob/main/LICENSE",
    qualification:
      "University textbook; however, it follows the course's OCaml version and is not the language reference.",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeCornellOcamlSearchIndex(
        await fetchText("https://cs3110.github.io/textbook/searchindex.js"),
        {
          baseUrl: "https://cs3110.github.io/textbook/",
          urlPrefix: "https://cs3110.github.io/textbook/",
          sourceId: "cornell-ocaml",
          programmingLanguage: "ocaml",
          sourceKind: "conventional",
          sourceName: "OCaml Programming: Correct + Efficient + Beautiful"
        }
      )
  },
  {
    sourceId: "solidity-by-example",
    programmingLanguage: "solidity",
    docsLocale: "en",
    adapter: "solidity-by-example-search",
    sourceKind: "community",
    sourceName: "Solidity by Example",
    upstreamVersion: "Solidity by Example rolling",
    urlPrefix: "https://solidity-by-example.org/",
    minimumRecords: 110,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Delegatecall", "Merkle Tree"],
    attribution: "Solidity by Example © Tasuku Nakamura and contributors; MIT.",
    licenseUrl:
      "https://github.com/Cyfrin/solidity-by-example.github.io/blob/gh-pages/LICENSE",
    qualification:
      "Example-oriented community guide; however, examples are not a security audit or production guidance.",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeSolidityByExampleSearch(await fetchText(SOLIDITY_SEARCH_URL), {
        baseUrl: "https://solidity-by-example.org/",
        urlPrefix: "https://solidity-by-example.org/",
        sourceId: "solidity-by-example",
        programmingLanguage: "solidity",
        sourceKind: "community",
        sourceName: "Solidity by Example"
      })
  },
  {
    sourceId: "common-lisp-cookbook",
    programmingLanguage: "commonlisp",
    docsLocale: "en",
    adapter: "markdown-link-index",
    sourceKind: "community",
    sourceName: "Common Lisp Cookbook",
    upstreamVersion: "Common Lisp Cookbook rolling",
    urlPrefix: "https://lispcookbook.github.io/cl-cookbook/",
    minimumRecords: 35,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Error and condition handling", "Macros and Backquote"],
    attribution:
      "Common Lisp Cookbook © Common Lisp Cookbook Project and LispCookbook GitHub Group; permissive documentation license.",
    licenseUrl:
      "https://github.com/LispCookbook/cl-cookbook/blob/master/license.md",
    qualification:
      "Community cookbook; however, recipes can be implementation- or library-specific.",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeCommonLispCookbookIndex(await fetchText(COMMON_LISP_INDEX_URL), {
        baseUrl: "https://lispcookbook.github.io/cl-cookbook/",
        urlPrefix: "https://lispcookbook.github.io/cl-cookbook/",
        sourceId: "common-lisp-cookbook",
        programmingLanguage: "commonlisp",
        sourceKind: "community",
        sourceName: "Common Lisp Cookbook"
      })
  },
  webDevCourseJob({
    sourceId: "webdev-html",
    programmingLanguage: "html",
    sourceName: "web.dev Learn HTML",
    course: "html",
    minimumRecords: 20,
    knownQueries: ["Semantic HTML", "Document Structure"]
  }),
  webDevCourseJob({
    sourceId: "webdev-css",
    programmingLanguage: "css",
    sourceName: "web.dev Learn CSS",
    course: "css",
    minimumRecords: 35,
    knownQueries: ["Container Queries", "Cascade"]
  })
];

function webDevCourseJob(options) {
  const urlPrefix = `https://web.dev/learn/${options.course}/`;
  const inputUrl = urlPrefix;
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    adapter: "webdev-course-index",
    sourceKind: "conventional",
    sourceName: options.sourceName,
    upstreamVersion: `${options.sourceName} rolling`,
    urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: `${options.sourceName} © Google; CC BY 4.0.`,
    licenseUrl: "https://developers.google.com/terms/site-policies",
    qualification:
      "Google-authored learning course; however, it is a tutorial rather than a normative standard.",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const parserOptions = {
        inputUrl,
        urlPrefix,
        sourceId: options.sourceId,
        programmingLanguage: options.programmingLanguage,
        sourceKind: "conventional",
        sourceName: options.sourceName
      };
      return normalizeWebDevCourse(
        await fetchText(inputUrl, {
          canonicalizer: "webdev-course-links-v1",
          canonicalize: (source) =>
            canonicalizeWebDevCourseInput(source, parserOptions)
        }),
        parserOptions
      );
    }
  };
}
