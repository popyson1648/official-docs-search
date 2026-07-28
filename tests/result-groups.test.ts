import { describe, expect, it } from "vitest";
import {
  groupSearchResults,
  orderSearchResultGroups
} from "../src/core/result-groups";
import type { RankedSearchRecord } from "../src/core/search";

describe("groupSearchResults", () => {
  it("groups one qualified reference symbol across different origins", () => {
    const groups = groupSearchResults([
      record("std::sort", "cpprefjp", "ja"),
      record("std::sort()", "cppreference-cpp", "ja"),
      record("std::ranges::sort", "cpprefjp", "ja")
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].title).toBe("std::sort");
    expect(groups[0].records.map((candidate) => candidate.sourceId)).toEqual([
      "cpprefjp",
      "cppreference-cpp"
    ]);
    expect(groups[1].records.map((candidate) => candidate.title)).toEqual([
      "std::ranges::sort"
    ]);
  });

  it("does not merge ambiguous titles, proposals, or duplicate pages from one origin", () => {
    const groups = groupSearchResults([
      record("sort", "guide-a", "en"),
      record("sort", "guide-b", "en"),
      record("pkg.Foo", "reference-a", "en"),
      record("pkg.foo", "reference-b", "en"),
      record("pkg.K", "reference-c", "en"),
      record("pkg.Ｋ", "reference-d", "en"),
      record("P1000R0: sort()", "papers-a", "en", "proposal"),
      record("P1000R0: sort()", "papers-b", "en", "proposal"),
      record("list.sort()", "python-docs", "en", "reference", "/one"),
      record("list.sort()", "python-docs", "en", "reference", "/two")
    ]);

    expect(groups).toHaveLength(10);
    expect(groups.every((group) => group.records.length === 1)).toBe(true);
  });

  it("preserves ranked group order and keeps localized origins selectable", () => {
    const groups = groupSearchResults([
      record("Array.prototype.sort()", "mdn", "ja"),
      record("Array.prototype.map()", "mdn", "ja"),
      record("Array.prototype.sort", "ecma-262", "en")
    ]);

    expect(groups.map((group) => group.title)).toEqual([
      "Array.prototype.sort()",
      "Array.prototype.map()"
    ]);
    expect(groups[0].records.map((candidate) => candidate.docsLocale)).toEqual([
      "ja",
      "en"
    ]);
  });

  it("orders by language name in either direction and preserves relevance ties", () => {
    const groups = groupSearchResults([
      recordForLanguage("Rust first", "rust"),
      recordForLanguage("C++ first", "cpp"),
      recordForLanguage("Rust second", "rust"),
      recordForLanguage("JavaScript first", "javascript")
    ]);
    const languageNames = new Map([
      ["rust", "Rust"],
      ["cpp", "C++"],
      ["javascript", "JavaScript"]
    ]);

    expect(
      orderSearchResultGroups(groups, languageNames, "language-asc").map(
        (group) => group.title
      )
    ).toEqual(["C++ first", "JavaScript first", "Rust first", "Rust second"]);
    expect(
      orderSearchResultGroups(groups, languageNames, "language-desc").map(
        (group) => group.title
      )
    ).toEqual(["Rust first", "Rust second", "JavaScript first", "C++ first"]);
    expect(
      orderSearchResultGroups(groups, languageNames, "relevance").map(
        (group) => group.title
      )
    ).toEqual(["Rust first", "C++ first", "Rust second", "JavaScript first"]);
  });
});

function recordForLanguage(
  title: string,
  programmingLanguage: string
): RankedSearchRecord {
  return {
    ...record(title, `${programmingLanguage}-docs`, "en"),
    programmingLanguage
  };
}

function record(
  title: string,
  sourceId: string,
  docsLocale: string,
  documentKind: RankedSearchRecord["documentKind"] = "reference",
  suffix = ""
): RankedSearchRecord {
  return {
    title,
    url: `https://example.com/${sourceId}${suffix}`,
    programmingLanguage: title.startsWith("Array") ? "javascript" : "cpp",
    docsLocale,
    sourceId,
    sourceName: sourceId,
    sourceKind: "official",
    documentKind,
    score: 100
  };
}
