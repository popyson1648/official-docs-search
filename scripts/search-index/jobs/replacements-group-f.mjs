import {
  normalizeCommonLispSitemap,
  normalizeGnuObjectiveCToc
} from "../parsers-group-f.mjs";

const GNU_OBJC_URL_PREFIX =
  "https://gcc.gnu.org/onlinedocs/gcc-15.2.0/gcc/";
const COMMON_LISP_URL_PREFIX =
  "https://lisp-docs.github.io/cl-language-reference/";

export const replacementGroupFJobs = [
  {
    sourceId: "gnu-objc",
    programmingLanguage: "objc",
    docsLocale: "en",
    adapter: "gnu-objective-c-toc",
    upstreamVersion: "GNU Compiler Collection 15.2 Objective-C Features",
    urlPrefix: GNU_OBJC_URL_PREFIX,
    minimumRecords: 20,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Fast Enumeration", "Type Encoding"],
    attribution:
      "GNU Objective-C Features © Free Software Foundation; GNU Free Documentation License 1.3 or later.",
    licenseUrl: `${GNU_OBJC_URL_PREFIX}GNU-Free-Documentation-License.html`,
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeGnuObjectiveCToc(
        await fetchText(`${GNU_OBJC_URL_PREFIX}index.html`),
        {
          urlPrefix: GNU_OBJC_URL_PREFIX,
          section: "GNU Objective-C Features"
        }
      )
  },
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
