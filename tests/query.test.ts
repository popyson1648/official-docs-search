import { describe, expect, it } from "vitest";
import { parseQuery } from "../src/core/query";

const knownLanguages = new Set(["python", "rust", "cpp", "c", "go", "r", "javascript"]);

describe("parseQuery", () => {
  it("treats a leading language as lang flag", () => {
    const parsed = parseQuery("c list", { knownLanguages });
    expect(parsed.languages).toEqual(["c"]);
    expect(parsed.searchText).toBe("list");
  });

  it("treats leading comma-separated languages as lang flag", () => {
    const parsed = parseQuery("c,go,r list", { knownLanguages });
    expect(parsed.languages).toEqual(["c", "go", "r"]);
    expect(parsed.searchText).toBe("list");
  });

  it("preserves programming syntax in search text", () => {
    const parsed = parseQuery("lang:rust Vec::<T> collect::<Vec<_>>()", { knownLanguages });
    expect(parsed.languages).toEqual(["rust"]);
    expect(parsed.searchText).toBe("Vec::<T> collect::<Vec<_>>()");
    expect(parsed.errors).toEqual([]);
  });

  it("accepts suffix flags", () => {
    const parsed = parseQuery("std::vector::push_back lang:cpp locale:ja source:all", { knownLanguages });
    expect(parsed.languages).toEqual(["cpp"]);
    expect(parsed.locale).toBe("ja");
    expect(parsed.sourceMode).toBe("all");
    expect(parsed.searchText).toBe("std::vector::push_back");
  });

  it("rejects flags inside search words", () => {
    const parsed = parseQuery("quick lang:python sort", { knownLanguages });
    expect(parsed.errors.map((error) => error.code)).toContain("flag_in_search_text");
  });

  it("does not treat code-like colon text as a flag", () => {
    const parsed = parseQuery("python dict key:value", { knownLanguages });
    expect(parsed.searchText).toBe("dict key:value");
    expect(parsed.errors).toEqual([]);
  });
});
