import { describe, expect, it } from "vitest";
import {
  expandSearchIndexBundle,
  normalizeSearchText,
  searchRecords,
  searchStoredIndexes,
  searchStoredIndexesWithFacets,
  type SearchRecord,
  type SupportedSearchIndexManifestEntry,
  type StoredSearchIndexBundle
} from "../src/core/search";

function record(overrides: Partial<SearchRecord> = {}): SearchRecord {
  return {
    title: "Iterator",
    url: "https://example.test/iterator",
    programmingLanguage: "python",
    docsLocale: "en",
    sourceId: "python-docs",
    sourceName: "Python Documentation",
    sourceKind: "official",
    documentKind: "reference",
    ...overrides
  };
}

describe("federated documentation search", () => {
  it("expands the compact on-disk bundle without changing result URLs", () => {
    const bundle: StoredSearchIndexBundle = {
      schemaVersion: 2,
      sourceId: "python-docs",
      docsLocale: "ja",
      urlPrefix: "https://docs.python.org/ja/3/",
      records: [["リストオブジェクト", "c-api/list.html", "C API"]]
    };
    const entry: SupportedSearchIndexManifestEntry = {
      sourceId: "python-docs",
      sourceName: "Python Documentation",
      sourceKind: "official",
      programmingLanguage: "python",
      docsLocale: "ja",
      status: "supported",
      path: "/search-index/python-docs.ja.fixture.json",
      recordCount: 1,
      qualification: "English caveat.",
      qualificationJa: "日本語の注意書き。"
    };

    expect(expandSearchIndexBundle(bundle, entry)).toEqual([
      record({
        title: "リストオブジェクト",
        url: "https://docs.python.org/ja/3/c-api/list.html",
        docsLocale: "ja",
        section: "C API",
        qualification: "English caveat.",
        qualificationJa: "日本語の注意書き。"
      })
    ]);
  });

  it("normalizes case, width, underscores, and hyphens", () => {
    expect(normalizeSearchText(" ＦＯＯ_bar-Baz ")).toBe("foo bar baz");
  });

  it("requires every query token and ranks title matches above section-only matches", () => {
    const results = searchRecords([
      record({ title: "List iterator", url: "https://example.test/one" }),
      record({ title: "List", section: "Iterator protocol", url: "https://example.test/two" }),
      record({ title: "Iterator", url: "https://example.test/three" })
    ], "list iterator");

    expect(results.map((result) => result.url)).toEqual([
      "https://example.test/one",
      "https://example.test/two"
    ]);
  });

  it("uses conservative typo tolerance while keeping exact matches first", () => {
    const records = [
      record({ title: "std::sort", url: "https://example.test/sort" }),
      record({ title: "std::stable_sort", url: "https://example.test/stable-sort" }),
      record({ title: "short", url: "https://example.test/short" })
    ];

    expect(searchRecords(records, "sort").map((result) => result.url)).toEqual([
      "https://example.test/sort",
      "https://example.test/stable-sort"
    ]);
    expect(searchRecords(records, "srot").map((result) => result.url)).toContain(
      "https://example.test/sort"
    );
    expect(searchRecords(records, "sot")).toEqual([]);
  });

  it("keeps every exact language result before fuzzy results from another language", () => {
    const results = searchRecords(
      [
        record({ title: "sort", url: "https://cpp.test/sort" }),
        record({ title: "sort details", url: "https://cpp.test/sort-details" }),
        record({
          title: "srot",
          url: "https://rust.test/srot",
          programmingLanguage: "rust",
          sourceId: "rust-docs",
          sourceName: "Rust Documentation"
        })
      ],
      "sort"
    );

    expect(results.map((result) => result.url)).toEqual([
      "https://cpp.test/sort",
      "https://cpp.test/sort-details",
      "https://rust.test/srot"
    ]);
  });

  it("ranks reference results ahead of proposal papers for broad API queries", () => {
    const results = searchRecords(
      [
        record({
          title: "std::execution",
          url: "https://example.test/reference",
          documentKind: "reference"
        }),
        record({
          title: "P2300R10: std::execution",
          url: "https://example.test/paper",
          documentKind: "proposal"
        })
      ],
      "execution"
    );

    expect(results.map((result) => result.url)).toEqual([
      "https://example.test/reference",
      "https://example.test/paper"
    ]);
  });

  it("keeps every selected programming language near the top of a combined result list", () => {
    const records = [
      ...Array.from({ length: 10 }, (_, index) =>
        record({ title: `Iterator ${index}`, url: `https://python.test/${index}` })
      ),
      record({
        title: "Iterator trait",
        url: "https://rust.test/iterator",
        programmingLanguage: "rust",
        sourceId: "rust-docs",
        sourceName: "Rust Documentation"
      })
    ];

    expect(new Set(searchRecords(records, "iterator", 5).map((result) => result.programmingLanguage))).toEqual(
      new Set(["python", "rust"])
    );
  });

  it("searches compact tuples without expanding every record", () => {
    const pythonEntry: SupportedSearchIndexManifestEntry = {
      sourceId: "python-docs",
      sourceName: "Python Documentation",
      sourceKind: "official",
      programmingLanguage: "python",
      docsLocale: "en",
      status: "supported",
      path: "/search-index/python.fixture.json",
      recordCount: 2
    };
    const rustEntry: SupportedSearchIndexManifestEntry = {
      ...pythonEntry,
      sourceId: "rust-docs",
      sourceName: "Rust Documentation",
      programmingLanguage: "rust",
      path: "/search-index/rust.fixture.json",
      recordCount: 1
    };

    const results = searchStoredIndexes(
      [
        {
          entry: pythonEntry,
          bundle: {
            schemaVersion: 2,
            sourceId: "python-docs",
            docsLocale: "en",
            urlPrefix: "https://docs.python.org/",
            records: [["Iterator", "iterator.html"], ["Unrelated", "other.html"]]
          }
        },
        {
          entry: rustEntry,
          bundle: {
            schemaVersion: 2,
            sourceId: "rust-docs",
            docsLocale: "en",
            urlPrefix: "https://doc.rust-lang.org/",
            records: [["Iterator trait", "std/iter/trait.Iterator.html"]]
          }
        }
      ],
      "iterator"
    );

    expect(new Set(results.map((result) => result.programmingLanguage))).toEqual(
      new Set(["python", "rust"])
    );
    expect(results).toHaveLength(2);
  });

  it("returns deduplicated source facets for every match beyond the result limit", () => {
    const entry = (
      sourceId: string,
      sourceName: string,
      path: string
    ): SupportedSearchIndexManifestEntry => ({
      sourceId,
      sourceName,
      sourceKind: "official",
      programmingLanguage: "javascript",
      docsLocale: "en",
      status: "supported",
      path,
      recordCount: 1
    });
    const mdnEntry = entry("mdn-js", "MDN JavaScript", "/search-index/mdn.fixture.json");
    const ecmaEntry = entry(
      "ecma-spec",
      "ECMAScript Specification",
      "/search-index/ecma.fixture.json"
    );
    const unrelatedEntry = entry(
      "javascript-guide",
      "JavaScript Guide",
      "/search-index/guide.fixture.json"
    );

    const result = searchStoredIndexesWithFacets(
      [
        {
          entry: mdnEntry,
          bundle: {
            schemaVersion: 2,
            sourceId: mdnEntry.sourceId,
            docsLocale: "en",
            urlPrefix: "https://developer.mozilla.org/",
            records: [["Promise", "promise.html"]]
          }
        },
        {
          entry: ecmaEntry,
          bundle: {
            schemaVersion: 2,
            sourceId: ecmaEntry.sourceId,
            docsLocale: "en",
            urlPrefix: "https://tc39.es/ecma262/",
            records: [["Promise objects", "promise-objects.html"]]
          }
        },
        {
          entry: { ...mdnEntry, path: "/search-index/mdn.second.fixture.json" },
          bundle: {
            schemaVersion: 2,
            sourceId: mdnEntry.sourceId,
            docsLocale: "en",
            urlPrefix: "https://developer.mozilla.org/",
            records: [["Promise constructor", "promise-constructor.html"]]
          }
        },
        {
          entry: unrelatedEntry,
          bundle: {
            schemaVersion: 2,
            sourceId: unrelatedEntry.sourceId,
            docsLocale: "en",
            urlPrefix: "https://javascript.example/",
            records: [["Modules", "modules.html"]]
          }
        }
      ],
      "promise",
      1
    );

    expect(result.records).toHaveLength(1);
    expect(result.facets).toEqual([
      {
        sourceId: "ecma-spec",
        sourceName: "ECMAScript Specification",
        programmingLanguage: "javascript"
      },
      {
        sourceId: "mdn-js",
        sourceName: "MDN JavaScript",
        programmingLanguage: "javascript"
      }
    ]);
  });

  it.each([
    {
      name: "an insecure URL prefix",
      urlPrefix: "http://docs.python.org/safe/",
      urlSuffix: "iterator.html"
    },
    {
      name: "a parent-path suffix",
      urlPrefix: "https://docs.python.org/safe/",
      urlSuffix: "../iterator.html"
    },
    {
      name: "a backslash parent-path suffix",
      urlPrefix: "https://docs.python.org/safe/",
      urlSuffix: "..\\iterator.html"
    },
    {
      name: "a script URL prefix",
      urlPrefix: "javascript:alert(document.domain)//",
      urlSuffix: "iterator"
    }
  ])("rejects $name from compact bundles", ({ urlPrefix, urlSuffix }) => {
    const entry: SupportedSearchIndexManifestEntry = {
      sourceId: "python-docs",
      sourceName: "Python Documentation",
      sourceKind: "official",
      programmingLanguage: "python",
      docsLocale: "en",
      status: "supported",
      path: "/search-index/python.unsafe.fixture.json",
      recordCount: 1
    };
    const bundle: StoredSearchIndexBundle = {
      schemaVersion: 2,
      sourceId: "python-docs",
      docsLocale: "en",
      urlPrefix,
      records: [["Iterator", urlSuffix]]
    };

    expect(() => expandSearchIndexBundle(bundle, entry)).toThrow(
      "Unsafe search result URL"
    );
    expect(() =>
      searchStoredIndexes([{ entry, bundle }], "iterator")
    ).toThrow("Unsafe search result URL");
  });
});
