import { describe, expect, it } from "vitest";
import {
  expandSearchIndexBundle,
  normalizeSearchText,
  searchRecords,
  searchStoredIndexes,
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
      recordCount: 1
    };

    expect(expandSearchIndexBundle(bundle, entry)).toEqual([
      record({
        title: "リストオブジェクト",
        url: "https://docs.python.org/ja/3/c-api/list.html",
        docsLocale: "ja",
        section: "C API"
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
