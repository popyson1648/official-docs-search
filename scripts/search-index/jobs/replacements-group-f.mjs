import {
  normalizeCommonLispSitemap
} from "../parsers-group-f.mjs";

const COMMON_LISP_URL_PREFIX =
  "https://lisp-docs.github.io/cl-language-reference/";

export const replacementGroupFJobs = [
  {
    sourceId: "cl-language-reference",
    programmingLanguage: "commonlisp",
    docsLocale: "en",
    adapter: "common-lisp-sitemap",
    upstreamVersion: "Common Lisp Technical Reference rolling",
    urlPrefix: COMMON_LISP_URL_PREFIX,
    minimumRecords: 900,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["mapcar", "defmacro"],
    attribution:
      "Common Lisp Technical Reference © 2023 LISP Docs; MIT. Based on public-domain dpANS3R sources.",
    licenseUrl:
      "https://github.com/lisp-docs/cl-language-reference/blob/main/LICENSE.md",
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeCommonLispSitemap(
        await fetchText(`${COMMON_LISP_URL_PREFIX}sitemap.xml`),
        { urlPrefix: COMMON_LISP_URL_PREFIX }
      )
  }
];
