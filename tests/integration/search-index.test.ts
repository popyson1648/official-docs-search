import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  expandSearchIndexBundle,
  isSupportedSearchIndexEntry,
  searchRecords,
  type SearchIndexManifest,
  type StoredSearchIndexBundle
} from "../../src/core/search";
import { isAllowedResultUrl, loadCatalog } from "../../src/core/sources";

const manifest = readJson<SearchIndexManifest>("public/search-index/manifest.json");
const supportedEntries = manifest.entries.filter(isSupportedSearchIndexEntry);
const bundles = new Map(
  supportedEntries.map((entry) => [entry.path, readJson<StoredSearchIndexBundle>(`public${entry.path}`)])
);
const catalog = loadCatalog();
const catalogSources = catalog.languages.flatMap((language) => language.sources);

function records(sourceId: string, docsLocale: string) {
  const entry = manifest.entries.find(
    (candidate) => candidate.sourceId === sourceId && candidate.docsLocale === docsLocale
  );
  if (!entry) throw new Error(`Missing index entry: ${sourceId}/${docsLocale}`);
  if (!isSupportedSearchIndexEntry(entry)) throw new Error(`Unsupported index entry: ${sourceId}/${docsLocale}`);
  return expandSearchIndexBundle(bundles.get(entry.path) as StoredSearchIndexBundle, entry);
}

describe("generated search indexes", () => {
  it("matches every catalog source-locale status in both directions", () => {
    const declared = catalog.languages.flatMap((language) =>
      language.sources.flatMap((source) =>
        source.indexes.map((index) => ({
          key: `${source.id}/${index.locale}`,
          name: source.name,
          kind: source.kind,
          language: language.id,
          status: index.status,
          reason: index.reason
        }))
      )
    );
    const projected = manifest.entries.map((entry) => ({
      key: `${entry.sourceId}/${entry.docsLocale}`,
      name: entry.sourceName,
      kind: entry.sourceKind,
      language: entry.programmingLanguage,
      status: entry.status,
      reason: entry.reason
    }));
    expect(projected).toEqual(declared);

    const expectedFiles = new Set(["manifest.json", ...supportedEntries.map((entry) => entry.path.slice(14))]);
    expect(new Set(readdirSync("public/search-index").filter((name) => name.endsWith(".json")))).toEqual(
      expectedFiles
    );
  });

  it("contains production-sized bundles for every initial adapter", () => {
    const counts = Object.fromEntries(
      supportedEntries.map((entry) => [`${entry.sourceId}/${entry.docsLocale}`, entry.recordCount])
    );
    expect(counts["python-docs/en"]).toBeGreaterThan(10_000);
    expect(counts["python-docs/ja"]).toBeGreaterThan(5_000);
    expect(counts["rust-docs/en"]).toBeGreaterThan(30_000);
    expect(counts["tc39-ecma262/en"]).toBeGreaterThan(2_000);
    expect(counts["mdn-js/en"]).toBeGreaterThan(1_000);
    expect(counts["typescript-docs/en"]).toBeGreaterThan(170);
    expect(counts["go-std/en"]).toBeGreaterThan(6_000);
    expect(counts["csharp-docs/en"]).toBeGreaterThan(250);
    expect(counts["java-docs/en"]).toBeGreaterThan(5_000);
    expect(counts["php-manual/en"]).toBeGreaterThan(9_000);
    expect(counts["php-manual/ja"]).toBeGreaterThan(9_000);
    expect(counts["ruby-docs/en"]).toBeGreaterThan(16_000);
    expect(counts["ruby-docs/ja"]).toBeGreaterThan(11_500);
  });

  it("matches manifest counts and only emits catalog-approved result URLs", () => {
    for (const entry of supportedEntries) {
      const bundle = bundles.get(entry.path) as StoredSearchIndexBundle;
      const expanded = expandSearchIndexBundle(bundle, entry);
      const source = catalogSources.find((candidate) => candidate.id === entry.sourceId);
      expect(source, entry.sourceId).toBeDefined();
      expect(bundle.records).toHaveLength(entry.recordCount);
      expect(expanded.every((record) => isAllowedResultUrl(record.url, [source!])), entry.path).toBe(true);
      const bytes = readFileSync(`public${entry.path}`);
      const outputHash = createHash("sha256").update(bytes).digest("hex");
      expect(outputHash).toBe(entry.outputSha256);
      expect(entry.path).toContain(outputHash.slice(0, 16));
    }
  });

  it("keeps the initial five indexes below one gzip megabyte and all indexes below one Brotli megabyte", () => {
    const initialKeys = new Set([
      "python-docs/en",
      "python-docs/ja",
      "rust-docs/en",
      "tc39-ecma262/en",
      "mdn-js/en"
    ]);
    const initialGzipBytes = supportedEntries
      .filter((entry) => initialKeys.has(`${entry.sourceId}/${entry.docsLocale}`))
      .reduce(
      (total, entry) => total + gzipSync(readFileSync(`public${entry.path}`)).byteLength,
      0
    );
    const completeBrotliBytes = supportedEntries.reduce(
      (total, entry) => total + (entry.brotliBytes ?? Number.POSITIVE_INFINITY),
      0
    );
    expect(initialGzipBytes).toBeLessThan(1_000_000);
    expect(completeBrotliBytes).toBeLessThan(1_000_000);
  });

  it("returns known English, Japanese, and non-official documentation results", () => {
    expect(searchRecords(records("python-docs", "en"), "list")[0]?.url).toMatch(/^https:\/\/docs\.python\.org\/3\.14\//);
    expect(searchRecords(records("python-docs", "ja"), "リスト")[0]?.url).toMatch(/^https:\/\/docs\.python\.org\/ja\/3\//);
    expect(searchRecords(records("rust-docs", "en"), "iterator")[0]?.url).toMatch(/^https:\/\/doc\.rust-lang\.org\//);
    expect(searchRecords(records("tc39-ecma262", "en"), "array")[0]?.url).toMatch(/^https:\/\/tc39\.es\/ecma262\//);
    expect(searchRecords(records("mdn-js", "en"), "proxy")[0]?.sourceId).toBe("mdn-js");
    expect(searchRecords(records("typescript-docs", "en"), "generics")[0]?.url).toMatch(
      /^https:\/\/www\.typescriptlang\.org\/docs\//
    );
    expect(searchRecords(records("go-std", "en"), "Reader")[0]?.url).toMatch(
      /^https:\/\/pkg\.go\.dev\//
    );
    expect(searchRecords(records("csharp-docs", "en"), "Generics")[0]?.url).toMatch(
      /^https:\/\/learn\.microsoft\.com\/en-us\/dotnet\/csharp\//
    );
    expect(searchRecords(records("java-docs", "en"), "List")[0]?.url).toMatch(
      /^https:\/\/docs\.oracle\.com\/en\/java\/javase\/25\/docs\/api\//
    );
    expect(searchRecords(records("php-manual", "ja"), "array_map")[0]?.url).toMatch(
      /^https:\/\/www\.php\.net\/manual\/ja\//
    );
    expect(searchRecords(records("ruby-docs", "ja"), "Enumerable")[0]?.url).toMatch(
      /^https:\/\/docs\.ruby-lang\.org\/ja\/3\.4\//
    );
  });

  it("returns both languages from one combined multi-language query", () => {
    const combined = [...records("python-docs", "en"), ...records("rust-docs", "en")];
    expect(new Set(searchRecords(combined, "iterator").map((record) => record.programmingLanguage))).toEqual(
      new Set(["python", "rust"])
    );
  });

  it("returns both newly indexed languages for a shared query", () => {
    const combined = [...records("typescript-docs", "en"), ...records("csharp-docs", "en")];
    expect(new Set(searchRecords(combined, "generics").map((record) => record.programmingLanguage))).toEqual(
      new Set(["typescript", "csharp"])
    );
  });
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
