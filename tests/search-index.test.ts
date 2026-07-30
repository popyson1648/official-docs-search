import { describe, expect, it } from "vitest";
import {
  extractHtmlLinks,
  normalizeDevdocsEntries,
  normalizeSphinxEntries,
  normalizeTc39Entries,
  parseJavadocSearchIndex,
  parseSphinxSearchIndex
} from "../scripts/search-index.mjs";
import {
  documentationUrl,
  restoreRustdocPathCase
} from "../scripts/search-index/job-helpers.mjs";

const base = {
  sourceId: "example-docs",
  programmingLanguage: "example",
  docsLocale: "en",
  sourceKind: "official" as const,
  sourceName: "Example Documentation"
};

describe("search index adapters", () => {
  it("normalizes a DevDocs manifest and removes duplicate URLs", () => {
    const records = normalizeDevdocsEntries(
      {
        entries: [
          { name: "Iterator", path: "iterator", type: "Trait" },
          { name: "Iterator duplicate", path: "iterator", type: "Trait" }
        ]
      },
      { ...base, buildUrl: (path: string) => `https://example.test/${path}.html` }
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ title: "Iterator", url: "https://example.test/iterator.html" });
  });

  it("restores case-sensitive rustdoc item routes that DevDocs lowercases", () => {
    const records = normalizeDevdocsEntries(
      {
        entries: [
          { name: "std::net::TcpListener", path: "std/net/struct.tcplistener", type: "std::net" },
          {
            name: "std::iter::Iterator::eq",
            path: "std/iter/trait.iterator#method.eq",
            type: "std::iter"
          },
          { name: "std::primitive::u32", path: "std/primitive.u32", type: "Primitives" },
          { name: "01.01. Installation", path: "book/ch01-01-installation", type: "Guide" }
        ]
      },
      {
        ...base,
        buildUrl: (path: string) => documentationUrl("https://doc.rust-lang.test/", path),
        resolvePath: restoreRustdocPathCase
      }
    );

    expect(records.map(({ url }) => url)).toEqual([
      "https://doc.rust-lang.test/std/net/struct.TcpListener.html",
      "https://doc.rust-lang.test/std/iter/trait.Iterator.html#method.eq",
      "https://doc.rust-lang.test/std/primitive.u32.html",
      "https://doc.rust-lang.test/book/ch01-01-installation.html"
    ]);
  });

  it("keeps rustdoc paths unchanged when the entry name cannot confirm the case", () => {
    expect(restoreRustdocPathCase("std/net/struct.tcplistener", { name: "" })).toBe(
      "std/net/struct.tcplistener"
    );
    expect(restoreRustdocPathCase("book/foreword", { name: "Foreword" })).toBe("book/foreword");
  });

  it("parses the JSON payload in the official Sphinx wrapper and normalizes entries", () => {
    const index = parseSphinxSearchIndex(
      'Search.setIndex({"docnames":["library/stdtypes"],"titles":["組み込み型"],"alltitles":{"リスト":[[0,"lists"]]}});'
    );
    const records = normalizeSphinxEntries(index, {
      ...base,
      docsLocale: "ja",
      buildUrl: (path: string, fragment?: string | null) =>
        `https://example.test/${path}.html${fragment ? `#${fragment}` : ""}`
    });

    expect(records.map((record) => record.title)).toEqual(["組み込み型", "リスト"]);
    expect(records[1].url).toBe("https://example.test/library/stdtypes.html#lists");
  });

  it("extracts searchable clauses from an official Ecmarkup document", () => {
    const records = normalizeTc39Entries(
      '<emu-clause id="sec-array"><h1>23.1 Array Objects</h1></emu-clause>',
      { ...base, baseUrl: "https://example.test/spec/", section: "Specification" }
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "23.1 Array Objects",
        url: "https://example.test/spec/#sec-array"
      })
    ]);
  });

  it("extracts and filters links from official HTML indexes", () => {
    const links = extractHtmlLinks(
      '<nav><a href="array.html">Array <strong>functions</strong></a><a href="../">Parent</a></nav>',
      { accept: ({ href }) => href.endsWith(".html") }
    );

    expect(links).toEqual([{ href: "array.html", title: "Array functions" }]);
  });

  it("parses Javadoc search-index assignments without evaluating JavaScript", () => {
    expect(
      parseJavadocSearchIndex(
        'typeSearchIndex = [{"p":"java.lang","l":"String","u":"java.lang.String"}]; updateSearchResults();'
      )
    ).toEqual([{ p: "java.lang", l: "String", u: "java.lang.String" }]);
    expect(() => parseJavadocSearchIndex("typeSearchIndex = notJson;")).toThrow(
      /Invalid Javadoc/
    );
  });
});
