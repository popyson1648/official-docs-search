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
site_locales = ["en"]
indexes = [{ locale = "en", status = "supported" }]

[[languages.sources]]
id = "mdn"
kind = "conventional"
name = "MDN Web Docs"
url = "https://developer.mozilla.org/"
domains = ["developer.mozilla.org"]
default_enabled = true
site_locales = ["en", "ja"]
indexes = [{ locale = "en", status = "supported" }, { locale = "ja", status = "planned", reason = "Fixture." }]

[[languages]]
id = "cpp"
name = "C++"
auto_non_official_fallback = true
aliases = ["c++"]
bare_aliases = ["cpp"]

[[languages.sources]]
id = "cppreference"
kind = "community"
name = "cppreference"
url = "https://en.cppreference.com/cpp/"
domains = ["en.cppreference.com"]
path_prefixes = ["/cpp/"]
default_enabled = true
site_locales = ["en"]
indexes = [{ locale = "en", status = "supported" }]

[[languages.sources]]
id = "wg21"
kind = "official"
document_kind = "proposal"
name = "WG21 Papers"
url = "https://www.open-std.org/"
domains = ["www.open-std.org"]
path_prefixes = ["/jtc1/"]
default_enabled = true
site_locales = ["en"]
indexes = [{ locale = "en", status = "supported" }]
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

  it("honors explicit source selection in official mode", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["javascript"],
      sourceMode: "official",
      enabledSourceIds: new Set()
    });
    expect(scope.sources).toEqual([]);
  });

  it("automatically adds reviewed non-official references per language", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["javascript", "cpp"],
      sourceMode: "official",
      enabledSourceIds: new Set(["ecma", "mdn", "cppreference", "wg21"]),
      autoIncludeNonOfficialWhenNoOfficial: true
    });
    expect(scope.sources.map((source) => source.id)).toEqual([
      "ecma",
      "cppreference",
      "wg21"
    ]);
    expect(scope.automaticFallbacks).toHaveLength(1);
    expect(scope.automaticFallbacks[0].language.id).toBe("cpp");
    expect(scope.automaticFallbacks[0].sources.map((source) => source.id)).toEqual([
      "cppreference"
    ]);
  });

  it("keeps automatic fallback disabled when the setting is off", () => {
    const scope = resolveSearchScope(catalog, {
      languages: ["cpp"],
      sourceMode: "official",
      autoIncludeNonOfficialWhenNoOfficial: false
    });
    expect(scope.sources.map((source) => source.id)).toEqual(["wg21"]);
    expect(scope.automaticFallbacks).toEqual([]);
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
