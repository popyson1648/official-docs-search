import { describe, expect, it } from "vitest";
import {
  getKnownLanguageIds,
  isAllowedResultUrl,
  loadCatalog,
  resolveSearchScope
} from "../src/core/sources";
import { normalizeLanguageId } from "../src/core/query";

const catalog = loadCatalog();
const languages = catalog.languages;
const allSources = languages.flatMap((language) => language.sources);
const trustedCommunitySourceIds = [
  "comprehensive-rust",
  "javascript-info",
  "typescript-deep-dive",
  "go-by-example",
  "cpp-core-guidelines",
  "php-the-right-way",
  "elixir-school",
  "learn-you-a-haskell",
  "advanced-r",
  "clojure-guides",
  "fsharp-for-fun-and-profit",
  "zig-guide",
  "programming-in-d",
  "cornell-ocaml",
  "solidity-by-example",
  "common-lisp-cookbook",
  "webdev-html",
  "webdev-css"
] as const;

describe("docs catalog integrity", () => {
  it("has unique language ids", () => {
    const ids = languages.map((language) => language.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has globally unique source ids", () => {
    const ids = allSources.map((source) => source.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

  it("never maps one alias to two different languages", () => {
    // A collision would make `python foo` ambiguous and silently resolve to
    // the wrong language.
    const owner = new Map<string, string>();
    for (const language of languages) {
      const tokens = [language.id, ...language.aliases, ...language.bareAliases];
      for (const token of tokens) {
        const normalized = normalizeLanguageId(token);
        const existing = owner.get(normalized);
        expect(existing === undefined || existing === language.id).toBe(true);
        owner.set(normalized, language.id);
      }
    }
  });

  it("gives every source at least one domain, an id, a name and a valid kind", () => {
    const validKinds = new Set(["official", "conventional", "community"]);
    for (const source of allSources) {
      expect(source.id, `source id missing`).toBeTruthy();
      expect(source.name, `name missing for ${source.id}`).toBeTruthy();
      expect(source.domains.length, `no domains for ${source.id}`).toBeGreaterThan(0);
      expect(validKinds.has(source.kind), `bad kind for ${source.id}`).toBe(true);
    }
  });

  it("keeps localized source qualifications complete", () => {
    for (const source of allSources) {
      if (!source.qualification) continue;
      expect(source.qualification.en, `${source.id} English qualification`).toBeTruthy();
      expect(source.qualification.ja, `${source.id} Japanese qualification`).toBeTruthy();
    }
  });

  it("admits the 18 reviewed non-official sources with visible bilingual qualifications", () => {
    expect(trustedCommunitySourceIds).toHaveLength(18);
    for (const id of trustedCommunitySourceIds) {
      const source = allSources.find((candidate) => candidate.id === id);
      expect(source, `${id} missing`).toBeDefined();
      expect(source?.kind, `${id} must remain non-official`).not.toBe("official");
      expect(source?.siteLocales).toEqual(["en"]);
      expect(source?.indexes).toEqual([{ locale: "en", status: "supported" }]);
      expect(source?.qualification?.en, `${id} English qualification`).toBeTruthy();
      expect(source?.qualification?.ja, `${id} Japanese qualification`).toBeTruthy();
      const language = languages.find((candidate) =>
        candidate.sources.some((candidateSource) => candidateSource.id === id)
      );
      expect(
        resolveSearchScope(catalog, {
          languages: [language?.id ?? ""],
          sourceMode: "official"
        }).sources.map((candidate) => candidate.id),
        `${id} leaked into official-only scope`
      ).not.toContain(id);
      expect(
        resolveSearchScope(catalog, {
          languages: [language?.id ?? ""],
          sourceMode: "all"
        }).sources.map((candidate) => candidate.id),
        `${id} missing from source:all scope`
      ).toContain(id);
    }
  });

  it("uses bare hostnames (no scheme or path) in domains", () => {
    for (const source of allSources) {
      for (const domain of source.domains) {
        expect(domain, `${source.id} domain should not include a scheme`).not.toMatch(/^https?:/);
        expect(domain, `${source.id} domain should not include a path`).not.toContain("/");
      }
    }
  });

  it("resolves every language back to at least one searchable source", () => {
    for (const language of languages) {
      const scope = resolveSearchScope(catalog, {
        languages: [language.id],
        sourceMode: "all"
      });
      expect(scope.languages.map((entry) => entry.id)).toContain(language.id);
      expect(scope.sources.length, `${language.id} resolved to no sources`).toBeGreaterThan(0);
    }
  });

  it("resolves every configured alias to its owning language", () => {
    for (const language of languages) {
      for (const alias of [language.id, ...language.aliases, ...language.bareAliases]) {
        const scope = resolveSearchScope(catalog, {
          languages: [alias],
          sourceMode: "all"
        });
        expect(scope.languages.map((entry) => entry.id), `alias ${alias}`).toContain(language.id);
      }
    }
  });

  it("gives every source a valid URL, locale, and allowed representative result", () => {
    for (const source of allSources) {
      expect(() => new URL(source.url), `invalid URL for ${source.id}`).not.toThrow();
      expect(source.siteLocales.length, `no site locales for ${source.id}`).toBeGreaterThan(0);
      expect(source.indexes.length, `no index statuses for ${source.id}`).toBe(source.siteLocales.length);
      expect(new Set(source.indexes.map((index) => index.locale))).toEqual(new Set(source.siteLocales));
      for (const locale of source.siteLocales) {
        expect(locale, `invalid locale for ${source.id}`).toMatch(/^[a-z]{2}(?:-[A-Z]{2})?$/);
      }
      for (const index of source.indexes) {
        if (index.status === "supported") {
          expect(index.reason, `supported index ${source.id}/${index.locale} should not have a reason`).toBeUndefined();
        } else {
          expect(index.reason, `missing reason for ${source.id}/${index.locale}`).toBeTruthy();
        }
      }
      const prefix = source.pathPrefixes[0] ?? "/";
      const pathname = prefix.endsWith("/") ? `${prefix}fixture` : `${prefix}/fixture`;
      expect(
        isAllowedResultUrl(`https://${source.domains[0]}${pathname}`, [source]),
        `representative URL rejected for ${source.id}`
      ).toBe(true);
    }
  });

  it("exposes the expanded language set through known language ids", () => {
    const known = getKnownLanguageIds(catalog);
    for (const id of ["python", "kotlin", "scala", "elixir", "zig", "sql"]) {
      expect(known.has(id), `${id} should be a known language`).toBe(true);
    }
    // Aliases normalize to their canonical id.
    expect(known.has(normalizeLanguageId("kt"))).toBe(true);
  });
});
