import { describe, expect, it } from "vitest";
import { normalizeCppreferenceApiPages } from "../scripts/search-index/cppreference-parsers.mjs";

describe("cppreference MediaWiki index", () => {
  it("preserves display titles and extensionless documentation URLs", () => {
    const records = normalizeCppreferenceApiPages(
      [
        {
          query: {
            pages: [
              {
                title: "cpp/algorithm/sort",
                pageprops: { displaytitle: "<span>std::sort</span>" }
              },
              {
                title: "cpp/algorithm/ranges/sort",
                pageprops: { displaytitle: "std::ranges::sort" }
              },
              { title: "c/algorithm/qsort", pageprops: { displaytitle: "qsort" } }
            ]
          }
        }
      ],
      {
        sourceId: "cppreference-cpp",
        sourceName: "cppreference C++",
        programmingLanguage: "cpp",
        docsLocale: "en",
        namespacePrefix: "cpp",
        urlPrefix: "https://en.cppreference.com/cpp/"
      }
    );

    expect(records.map(({ title, url }) => [title, url])).toEqual([
      ["std::sort", "https://en.cppreference.com/cpp/algorithm/sort"],
      ["std::ranges::sort", "https://en.cppreference.com/cpp/algorithm/ranges/sort"]
    ]);
  });

  it("rejects malformed API pages", () => {
    expect(() =>
      normalizeCppreferenceApiPages(
        [{ query: { pages: "invalid" } }],
        {
          namespacePrefix: "cpp",
          urlPrefix: "https://en.cppreference.com/cpp/"
        }
      )
    ).toThrow(/MediaWiki/);
  });
});
