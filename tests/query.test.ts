import { describe, expect, it } from "vitest";
import { parseQuery } from "../src/core/query";
import { getKnownLanguageIds, loadCatalog, resolveSearchScope } from "../src/core/sources";

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

  it("marks the leading language token as a valid language flag", () => {
    // The input highlighter colours tokens the parser reports as flags, so a
    // bare language must surface as a valid language flag (not search text).
    const parsed = parseQuery("python list comprehension", { knownLanguages });
    const leading = parsed.flags.find((flag) => flag.start === 0);
    expect(leading).toMatchObject({ kind: "language", valid: true });
    expect(parsed.searchText).toBe("list comprehension");
  });
});

describe("parseQuery with the shipped catalog", () => {
  const catalog = loadCatalog();
  const knownLanguages = getKnownLanguageIds(catalog);

  it.each([
    ["python list", ["python"], "list"],
    ["kotlin coroutines", ["kotlin"], "coroutines"],
    ["zig comptime", ["zig"], "comptime"],
    ["sql window functions", ["sql"], "window functions"]
  ])("recognizes a leading language in %j", (query, languages, searchText) => {
    const parsed = parseQuery(query, { knownLanguages });
    expect(parsed.languages).toEqual(languages);
    expect(parsed.searchText).toBe(searchText);
    expect(parsed.errors).toEqual([]);
  });

  it.each([
    ["py", "python"],
    ["kt", "kotlin"],
    ["rs", "rust"]
  ])("an alias %j selects the %j documentation", (alias, canonical) => {
    const parsed = parseQuery(`${alias} iterators`, { knownLanguages });
    expect(parsed.languages).toHaveLength(1);
    const scope = resolveSearchScope(catalog, {
      languages: parsed.languages,
      sourceMode: "all"
    });
    expect(scope.languages.map((language) => language.id)).toContain(canonical);
  });

  it("treats an unknown leading word as search text, not a language", () => {
    const parsed = parseQuery("banana split", { knownLanguages });
    expect(parsed.languages).toEqual([]);
    expect(parsed.searchText).toBe("banana split");
  });
});
