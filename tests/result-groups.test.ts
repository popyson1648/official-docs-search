import { describe, expect, it } from "vitest";
import { groupSearchResults } from "../src/core/result-groups";
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
});

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
