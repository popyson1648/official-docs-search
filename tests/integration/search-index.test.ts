import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildRuntimeSearchManifest
} from "../../scripts/search-index-generator.mjs";
import {
  expandSearchIndexBundle,
  isSupportedSearchIndexEntry,
  searchRecords,
  type SearchIndexManifest,
  type StoredSearchIndexBundle
} from "../../src/core/search";
import { runSearchRequest } from "../../src/core/search-runtime";
import {
  isAllowedResultUrl,
  loadCatalog
} from "../../src/core/sources";

const manifest = readJson<SearchIndexManifest>("public/search-index/manifest.json");
const runtimeManifest = readJson<SearchIndexManifest>(
  "public/search-index/runtime-manifest.json"
);
const supportedEntries = manifest.entries.filter(isSupportedSearchIndexEntry);
const bundles = new Map(
  supportedEntries.map((entry) => [entry.path, readJson<StoredSearchIndexBundle>(`public${entry.path}`)])
);
const catalog = loadCatalog();
const catalogSources = catalog.languages.flatMap((language) => language.sources);
const trustedCommunitySourceIds = new Set([
  "comprehensive-rust", "javascript-info", "typescript-deep-dive",
  "go-by-example", "cpp-core-guidelines", "php-the-right-way",
  "elixir-school", "learn-you-a-haskell", "advanced-r", "clojure-guides",
  "fsharp-for-fun-and-profit", "zig-guide", "programming-in-d",
  "cornell-ocaml", "solidity-by-example", "common-lisp-cookbook",
  "webdev-html", "webdev-css", "cpprefjp"
]);

function records(sourceId: string, docsLocale: string) {
  const entry = manifest.entries.find(
    (candidate) => candidate.sourceId === sourceId && candidate.docsLocale === docsLocale
  );
  if (!entry) throw new Error(`Missing index entry: ${sourceId}/${docsLocale}`);
  if (!isSupportedSearchIndexEntry(entry)) throw new Error(`Unsupported index entry: ${sourceId}/${docsLocale}`);
  return expandSearchIndexBundle(bundles.get(entry.path) as StoredSearchIndexBundle, entry);
}

describe("generated search indexes", () => {
  it("keeps the committed runtime manifest synchronized with the complete manifest", () => {
    expect(runtimeManifest).toEqual(buildRuntimeSearchManifest(manifest));
  });

  it("keeps the approved language and locale coverage matrix", () => {
    expect(supportedEntries).toHaveLength(90);
    expect(
      new Set(manifest.entries.map((entry) => entry.programmingLanguage)
    ).size).toBe(44);
    expect(
      new Set(supportedEntries.map((entry) => entry.programmingLanguage)
    ).size).toBe(44);
    expect(
      supportedEntries.filter((entry) => entry.docsLocale === "ja")
    ).toHaveLength(18);
  });

  it("keeps every admitted non-official source qualified in both UI languages", () => {
    const admittedEntries = supportedEntries.filter((entry) =>
      trustedCommunitySourceIds.has(entry.sourceId)
    );
    expect(admittedEntries).toHaveLength(19);
    for (const entry of admittedEntries) {
      const catalogSource = catalogSources.find(
        (source) => source.id === entry.sourceId
      );
      expect(entry.sourceKind, entry.sourceId).not.toBe("official");
      expect(entry.docsLocale, entry.sourceId).toBe(
        entry.sourceId === "cpprefjp" ? "ja" : "en"
      );
      expect(entry.qualification, `${entry.sourceId} English qualification`).toBe(
        catalogSource?.qualification?.en
      );
      expect(entry.qualificationJa, `${entry.sourceId} Japanese qualification`).toBe(
        catalogSource?.qualification?.ja
      );
    }
  });

  it("matches every catalog source-locale status in both directions", () => {
    const declared = catalog.languages.flatMap((language) =>
      language.sources.flatMap((source) =>
        source.indexes.map((index) => ({
          key: `${source.id}/${index.locale}`,
          name: source.name,
          kind: source.kind,
          documentKind: source.documentKind,
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
      documentKind: entry.documentKind ?? "reference",
      language: entry.programmingLanguage,
      status: entry.status,
      reason: entry.reason
    }));
    expect(projected).toEqual(declared);

    const expectedFiles = new Set([
      "manifest.json",
      "runtime-manifest.json",
      ...supportedEntries.map((entry) => entry.path.slice(14))
    ]);
    expect(new Set(readdirSync("public/search-index").filter((name) => name.endsWith(".json")))).toEqual(
      expectedFiles
    );
  });

  it(
    "keeps the runtime projection search-equivalent for every known query",
    { timeout: 120_000 },
    async () => {
      const completeCaches = runtimeCaches();
      const projectedCaches = runtimeCaches();

      for (const entry of supportedEntries) {
        for (const query of entry.knownQueries ?? []) {
          const language = catalog.languages.find(
            (candidate) => candidate.id === entry.programmingLanguage
          );
          expect(language, entry.programmingLanguage).toBeDefined();
          const sources = language!.sources.map(({ id, name }) => ({ id, name }));
          const request = {
            query,
            docsLocale: entry.docsLocale,
            sources,
            limit: 60
          };

          const complete = await runSearchRequest(
            request,
            manifestFetcher(manifest),
            completeCaches.bundles,
            completeCaches.manifests
          );
          const projected = await runSearchRequest(
            request,
            manifestFetcher(runtimeManifest),
            projectedCaches.bundles,
            projectedCaches.manifests
          );
          expect(
            projected,
            `${entry.sourceId}/${entry.docsLocale}: ${query}`
          ).toEqual(complete);
        }
      }
    }
  );

  it(
    "keeps C++ exact, fuzzy, locale, and source-policy results identical",
    { timeout: 30_000 },
    async () => {
      const cpp = catalog.languages.find((language) => language.id === "cpp");
      expect(cpp).toBeDefined();
      const completeCaches = runtimeCaches();
      const projectedCaches = runtimeCaches();
      const sourceSets = {
        official: cpp!.sources.filter((source) => source.kind === "official"),
        fallback: cpp!.autoNonOfficialFallback
          ? cpp!.sources
          : cpp!.sources.filter((source) => source.kind === "official"),
        all: cpp!.sources
      };

      for (const query of ["sort", "srot", "P2300R10"]) {
        for (const docsLocale of ["", "en", "ja"]) {
          for (const [policy, selectedSources] of Object.entries(sourceSets)) {
            const request = {
              query,
              docsLocale,
              sources: selectedSources.map(({ id, name }) => ({ id, name })),
              limit: 60
            };
            const complete = await runSearchRequest(
              request,
              manifestFetcher(manifest),
              completeCaches.bundles,
              completeCaches.manifests
            );
            const projected = await runSearchRequest(
              request,
              manifestFetcher(runtimeManifest),
              projectedCaches.bundles,
              projectedCaches.manifests
            );
            expect(
              projected,
              `${query}/${docsLocale || "all-locales"}/${policy}`
            ).toEqual(complete);
          }
        }
      }
    }
  );

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
    expect(counts["cppreference-cpp/en"]).toBeGreaterThan(6_000);
    expect(counts["cppreference-cpp/ja"]).toBeGreaterThan(3_800);
    expect(counts["cpprefjp/ja"]).toBeGreaterThan(6_000);
    expect(counts["wg21-papers/en"]).toBeGreaterThan(7_000);
    expect(counts["python-peps/en"]).toBeGreaterThan(600);
    expect(counts["openjdk-jeps/en"]).toBeGreaterThan(450);
    expect(counts["tc39-proposals/en"]).toBeGreaterThanOrEqual(293);
  });

  it("publishes qualified API titles and conservative prose context", () => {
    const titleAt = (sourceId: string, locale: string, suffix: string) =>
      records(sourceId, locale).find((record) => record.url.endsWith(suffix))?.title;

    expect(titleAt("cpprefjp", "ja", "/reference/algorithm/sort.html")).toBe(
      "std::sort"
    );
    expect(titleAt("cpprefjp", "ja", "/reference/list/list/sort.html")).toBe(
      "std::list::sort"
    );
    expect(titleAt("ruby-docs", "en", "/Array.html#method-c-new")).toBe(
      "Array::new"
    );
    expect(titleAt("ruby-docs", "ja", "/method/Benchmark=3a=3aJob/s/new.html")).toBe(
      "Benchmark::Job.new"
    );
    expect(titleAt("elixir-docs", "en", "/Date.html#t:t/0")).toBe("Date.t()");
    expect(titleAt("java-docs", "en", "/java/util/List.html")).toBe(
      "java.util.List"
    );
    expect(titleAt("dart-docs", "en", "/tools/dartpad/troubleshoot")).toBe(
      "Troubleshoot — dartpad"
    );
    expect(records("wg21-papers", "en").some((record) =>
      record.title.startsWith("P2300R10:")
    )).toBe(true);
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

  it("keeps individual and selected working sets within transfer budgets", () => {
    for (const entry of supportedEntries) {
      expect(entry.brotliBytes, `${entry.sourceId}/${entry.docsLocale}`).toBeLessThan(750_000);
    }

    const defaultLanguages = new Set(catalog.languages.slice(0, 4).map((language) => language.id));
    const defaultEnglishBytes = supportedEntries
      .filter(
        (entry) =>
          defaultLanguages.has(entry.programmingLanguage) &&
          entry.docsLocale === "en" &&
          entry.sourceKind === "official"
      )
      .reduce((total, entry) => total + (entry.brotliBytes ?? Number.POSITIVE_INFINITY), 0);
    expect(defaultEnglishBytes).toBeLessThan(1_000_000);

    const largestFourLanguageBytes = [...supportedEntries]
      .sort(
        (left, right) =>
          (right.brotliBytes ?? Number.POSITIVE_INFINITY) -
          (left.brotliBytes ?? Number.POSITIVE_INFINITY)
      )
      .filter(
        (entry, index, entries) =>
          entries.findIndex(
            (candidate) => candidate.programmingLanguage === entry.programmingLanguage
          ) === index
      )
      .slice(0, 4)
      .reduce((total, entry) => total + (entry.brotliBytes ?? Number.POSITIVE_INFINITY), 0);
    expect(largestFourLanguageBytes).toBeLessThan(2_000_000);
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
    expect(searchRecords(records("cppreference-cpp", "en"), "sort")[0]?.title).toContain("sort");
    expect(searchRecords(records("cppreference-cpp", "en"), "srot")[0]?.title).toContain("sort");
    expect(searchRecords(records("cpprefjp", "ja"), "sort")[0]?.url).toMatch(
      /^https:\/\/cpprefjp\.github\.io\//
    );
    expect(searchRecords(records("wg21-papers", "en"), "P2300R10")[0]?.url).toMatch(
      /^https:\/\/www\.open-std\.org\/jtc1\/sc22\/wg21\/docs\/papers\//
    );
    expect(searchRecords(records("python-peps", "en"), "PEP 703")[0]?.url).toBe(
      "https://peps.python.org/pep-0703/"
    );
    expect(searchRecords(records("openjdk-jeps", "en"), "JEP 444")[0]?.url).toBe(
      "https://openjdk.org/jeps/444"
    );
    expect(searchRecords(records("tc39-proposals", "en"), "Decorators")[0]?.url).toMatch(
      /^https:\/\/github\.com\/tc39\/proposal-decorators/
    );
  });

  it("returns a known result for every supported source and locale", () => {
    for (const entry of supportedEntries) {
      const query = entry.knownQueries?.[0];
      expect(query, `${entry.sourceId}/${entry.docsLocale} known query`).toBeTruthy();
      expect(
        searchRecords(records(entry.sourceId, entry.docsLocale), query as string).length,
        `${entry.sourceId}/${entry.docsLocale}: ${query}`
      ).toBeGreaterThan(0);
    }
  });

  it("returns every declared regression query for new standards and proposal sources", () => {
    for (const sourceId of [
      "cpprefjp",
      "wg21-papers",
      "python-peps",
      "openjdk-jeps",
      "tc39-proposals"
    ]) {
      const entry = supportedEntries.find((candidate) => candidate.sourceId === sourceId);
      expect(entry, sourceId).toBeDefined();
      for (const query of entry?.knownQueries ?? []) {
        expect(
          searchRecords(records(sourceId, entry?.docsLocale ?? "en"), query).length,
          `${sourceId}: ${query}`
        ).toBeGreaterThan(0);
      }
    }
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

function runtimeCaches() {
  return {
    bundles: new Map(),
    manifests: new Map()
  };
}

function manifestFetcher(selectedManifest: SearchIndexManifest): typeof fetch {
  return async (input) => {
    const path = String(input);
    if (path === "/search-index/runtime-manifest.json") {
      return new Response(JSON.stringify(selectedManifest), { status: 200 });
    }
    const bundle = bundles.get(path);
    return bundle
      ? new Response(JSON.stringify(bundle), { status: 200 })
      : new Response("not found", { status: 404 });
  };
}
