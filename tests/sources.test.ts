import { describe, expect, it } from "vitest";
import { isAllowedResultUrl, parseCatalog, resolveSearchScope } from "../src/core/sources";

const toml = `
[[languages]]
id = "javascript"
name = "JavaScript"
aliases = ["js"]
bare_aliases = ["javascript", "js"]

[[languages.sources]]
id = "ecma"
kind = "official"
name = "ECMAScript Specification"
url = "https://tc39.es/ecma262/"
domains = ["tc39.es"]
path_prefixes = ["/ecma262/"]
default_enabled = true
locales = ["en"]

[[languages.sources]]
id = "mdn"
kind = "conventional"
name = "MDN Web Docs"
url = "https://developer.mozilla.org/"
domains = ["developer.mozilla.org"]
default_enabled = true
locales = ["en", "ja"]
`;

describe("sources", () => {
  const catalog = parseCatalog(toml);

  it("defaults to official sources", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["javascript"],
      sourceMode: "official"
    });
    expect(scope.sources.map((source) => source.id)).toEqual(["ecma"]);
  });

  it("includes enabled trusted sources in all mode", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["javascript"],
      sourceMode: "all",
      enabledSourceIds: new Set(["ecma", "mdn"])
    });
    expect(scope.sources.map((source) => source.id)).toEqual(["ecma", "mdn"]);
  });

  it("reports locale gaps", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["javascript"],
      sourceMode: "official",
      locale: "ja"
    });
    expect(scope.localeNotices).toHaveLength(1);
    expect(scope.localeNotices[0].sources[0].id).toBe("ecma");
  });

  it("filters result URLs by domain and path prefix", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["javascript"],
      sourceMode: "official"
    });
    expect(isAllowedResultUrl("https://tc39.es/ecma262/#sec-array-objects", scope.sources)).toBe(true);
    expect(isAllowedResultUrl("https://tc39.es/other/", scope.sources)).toBe(false);
    expect(isAllowedResultUrl("https://example.com/ecma262/", scope.sources)).toBe(false);
  });
});
