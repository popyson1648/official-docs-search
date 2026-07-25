import { normalizeHtmlToc } from "../parsers-group-d.mjs";
import { normalizeGnuObjectiveCToc } from "../parsers-group-f.mjs";

const GFORTRAN_URL_PREFIX =
  "https://gcc.gnu.org/onlinedocs/gfortran/";
const GNU_OBJC_URL_PREFIX =
  "https://gcc.gnu.org/onlinedocs/gcc-15.2.0/gcc/";

export const gnuJobs = [
  {
    sourceId: "gfortran",
    programmingLanguage: "fortran",
    docsLocale: "en",
    adapter: "html-toc",
    upstreamVersion: "GNU Fortran rolling manual",
    urlPrefix: GFORTRAN_URL_PREFIX,
    minimumRecords: 450,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: [
      "GNU Fortran Command Options",
      "Intrinsic Procedures"
    ],
    attribution:
      "GNU Fortran manual © Free Software Foundation; GNU FDL 1.3 or later.",
    licenseUrl:
      `${GFORTRAN_URL_PREFIX}GNU-Free-Documentation-License.html`,
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeHtmlToc(
        await fetchText(`${GFORTRAN_URL_PREFIX}index.html`),
        {
          inputUrl: `${GFORTRAN_URL_PREFIX}index.html`,
          acceptUrl: (url) =>
            url.href.startsWith(GFORTRAN_URL_PREFIX) &&
            !url.pathname.endsWith("/") &&
            !url.pathname.endsWith("/index.html")
        }
      )
  },
  {
    sourceId: "gnu-objc",
    programmingLanguage: "objc",
    docsLocale: "en",
    adapter: "gnu-objective-c-toc",
    upstreamVersion:
      "GNU Compiler Collection 15.2 Objective-C Features",
    urlPrefix: GNU_OBJC_URL_PREFIX,
    minimumRecords: 20,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Fast Enumeration", "Type Encoding"],
    attribution:
      "GNU Objective-C Features © Free Software Foundation; GNU Free Documentation License 1.3 or later.",
    licenseUrl:
      `${GNU_OBJC_URL_PREFIX}GNU-Free-Documentation-License.html`,
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeGnuObjectiveCToc(
        await fetchText(`${GNU_OBJC_URL_PREFIX}index.html`),
        {
          urlPrefix: GNU_OBJC_URL_PREFIX,
          section: "GNU Objective-C Features"
        }
      )
  }
];
