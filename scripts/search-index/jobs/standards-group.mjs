import {
  extractWg21YearUrls,
  normalizeWg21PaperTables
} from "../standards-parsers.mjs";

export const standardsGroupJobs = [
  {
    sourceId: "wg21-papers",
    programmingLanguage: "cpp",
    docsLocale: "en",
    adapter: "wg21-paper-index",
    upstreamVersion: "WG21 papers rolling",
    urlPrefix: "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/",
    minimumRecords: 7_000,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["P2300", "contracts", "reflection"],
    attribution:
      "ISO/IEC JTC 1/SC 22/WG 21 public paper metadata; copyright and reuse terms are set by each paper and its authors.",
    licenseUrl: "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/",
    updateFrequency: "monthly",
    load: async ({ fetchText }) => {
      const rootUrl =
        "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/";
      const yearUrls = extractWg21YearUrls(await fetchText(rootUrl), rootUrl);
      const pages = await mapWithConcurrency(
        yearUrls,
        4,
        async (url) => ({ url, html: await fetchText(url) })
      );
      return normalizeWg21PaperTables(pages, {
          sourceId: "wg21-papers",
          programmingLanguage: "cpp",
          docsLocale: "en",
          sourceKind: "official",
          sourceName: "WG21 Papers"
        });
    }
  }
];

async function mapWithConcurrency(values, concurrency, mapper) {
  const result = new Array(values.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor++;
        result[index] = await mapper(values[index]);
      }
    })
  );
  return result;
}
