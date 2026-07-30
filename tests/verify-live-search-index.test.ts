import { describe, expect, it, vi } from "vitest";
import {
  selectManifestEntries,
  verifyLiveEntries
} from "../scripts/verify-live-search-index.mjs";

const entries = [
  {
    sourceId: "weekly-docs",
    docsLocale: "en",
    status: "supported",
    updateFrequency: "weekly",
    path: "/search-index/weekly.json",
    knownQueries: ["Record"]
  },
  {
    sourceId: "gfortran",
    docsLocale: "en",
    status: "supported",
    updateFrequency: "monthly",
    path: "/search-index/gfortran.json",
    knownQueries: ["Option"]
  },
  {
    sourceId: "planned-docs",
    docsLocale: "en",
    status: "planned",
    updateFrequency: "weekly"
  }
];

describe("live result verification selection", () => {
  it("selects entries by frequency and source", () => {
    expect(
      selectManifestEntries(entries, ["--frequency", "weekly"]).map(
        (entry: { sourceId: string }) => entry.sourceId
      )
    ).toEqual(["weekly-docs"]);
    expect(
      selectManifestEntries(entries, ["--source=gfortran/en"]).map(
        (entry: { sourceId: string }) => entry.sourceId
      )
    ).toEqual(["gfortran"]);
  });

  it("rejects unknown and empty selections", () => {
    expect(() =>
      selectManifestEntries(entries, ["--source", "missing"])
    ).toThrow(/Unknown source selector/);
    expect(() =>
      selectManifestEntries(entries, [
        "--frequency",
        "weekly",
        "--exclude-source",
        "weekly-docs"
      ])
    ).toThrow(/selection is empty/);
  });

  it("fetches only the entries passed by the caller", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    const selected = selectManifestEntries(entries, [
      "--source",
      "gfortran"
    ]);
    const results = await verifyLiveEntries(selected, {
      fetcher,
      bundleReader: () => ({
        urlPrefix: "https://gcc.gnu.org/onlinedocs/gfortran/",
        records: [["Option Summary", "Option-Summary.html"]]
      })
    });

    expect(results).toEqual([
      {
        message:
          "gfortran/en: 200 https://gcc.gnu.org/onlinedocs/gfortran/Option-Summary.html"
      }
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("matches known-query tokens across qualified title separators", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    const results = await verifyLiveEntries(
      [
        {
          sourceId: "cpprefjp",
          docsLocale: "ja",
          status: "supported",
          updateFrequency: "weekly",
          path: "/search-index/cpprefjp.json",
          knownQueries: ["ranges_sort"]
        }
      ],
      {
        fetcher,
        bundleReader: () => ({
          urlPrefix: "https://cpprefjp.github.io/",
          records: [
            ["std::ranges::sort", "reference/algorithm/ranges_sort.html"]
          ]
        })
      }
    );

    expect(results).toEqual([
      {
        message:
          "cpprefjp/ja: 200 https://cpprefjp.github.io/reference/algorithm/ranges_sort.html"
      }
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("prefers an exact known-query title over an earlier partial match", async () => {
    const fetcher = vi.fn(async () => new Response("ok"));
    const results = await verifyLiveEntries(
      [
        {
          sourceId: "groovy-docs",
          docsLocale: "en",
          status: "supported",
          updateFrequency: "weekly",
          path: "/search-index/groovy.json",
          knownQueries: ["type checking extensions"]
        }
      ],
      {
        fetcher,
        bundleReader: () => ({
          urlPrefix: "https://docs.example.test/",
          records: [
            [
              "1.6.7. Type checking extensions",
              "index.html#_type_checking_extensions"
            ],
            [
              "type checking extensions",
              "core-semantics.html#_type_checking_extensions"
            ]
          ]
        })
      }
    );

    expect(results).toEqual([
      {
        message:
          "groovy-docs/en: 200 https://docs.example.test/core-semantics.html#_type_checking_extensions"
      }
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
