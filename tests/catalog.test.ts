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
