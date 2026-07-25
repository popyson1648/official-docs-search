import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runSearchRequest } from "../src/core/search-runtime";

describe("search runtime", () => {
  it("does not use HTML string injection sinks in client rendering code", () => {
    const clientDirectory = new URL("../src/client/", import.meta.url);
    const clientSources = readdirSync(clientDirectory)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(new URL(name, clientDirectory), "utf8"));
    const pageSource = readFileSync(
      new URL("../src/pages/index.astro", import.meta.url),
      "utf8"
    );

    for (const source of [...clientSources, pageSource]) {
      expect(source).not.toMatch(/\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b|set:html/);
    }
  });

  it("uses explicit support states and searches compact bundles", async () => {
    const responses = new Map<string, unknown>([
      [
        "/search-index/manifest.json",
        {
          schemaVersion: 2,
          generatorVersion: "2",
          catalogSha256: "fixture",
          entries: [
            {
              sourceId: "python-docs",
              sourceName: "Python Documentation",
              sourceKind: "official",
              programmingLanguage: "python",
              docsLocale: "en",
              status: "supported",
              path: "/search-index/python.fixture.json",
              recordCount: 1
            },
            {
              sourceId: "go-docs",
              sourceName: "Go Documentation",
              sourceKind: "official",
              programmingLanguage: "go",
              docsLocale: "en",
              status: "planned",
              reason: "Guide adapter is planned."
            }
          ]
        }
      ],
      [
        "/search-index/python.fixture.json",
        {
          schemaVersion: 2,
          sourceId: "python-docs",
          docsLocale: "en",
          urlPrefix: "https://docs.python.org/",
          records: [["Iterator", "iterator.html"]]
        }
      ]
    ]);
    const fetcher = async (path: string | URL | Request) =>
      new Response(JSON.stringify(responses.get(String(path))), {
        status: responses.has(String(path)) ? 200 : 404
      });

    const result = await runSearchRequest(
      {
        query: "iterator",
        docsLocale: "en",
        sources: [
          { id: "python-docs", name: "Python Documentation" },
          { id: "go-docs", name: "Go Documentation" }
        ]
      },
      fetcher
    );

    expect(result.records[0]).toMatchObject({
      sourceId: "python-docs",
      url: "https://docs.python.org/iterator.html"
    });
    expect(result.facets).toEqual([
      {
        sourceId: "python-docs",
        sourceName: "Python Documentation",
        programmingLanguage: "python"
      }
    ]);
    expect(result.unavailableSources).toEqual([
      {
        id: "go-docs",
        name: "Go Documentation",
        status: "planned",
        reason: "Guide adapter is planned."
      }
    ]);
    expect(result.fallbackSources).toEqual([]);
    expect(result.failedSources).toEqual([]);
  });

  it("propagates facets from matches outside the result limit", async () => {
    const responses = new Map<string, unknown>([
      [
        "/search-index/manifest.json",
        {
          schemaVersion: 2,
          generatorVersion: "2",
          catalogSha256: "fixture",
          entries: [
            supportedEntry("mdn-js", "javascript", "en", "/mdn.en.json"),
            supportedEntry("ecma-spec", "javascript", "en", "/ecma.en.json")
          ]
        }
      ],
      [
        "/mdn.en.json",
        bundle("mdn-js", "en", "https://developer.mozilla.org/", "Promise")
      ],
      [
        "/ecma.en.json",
        bundle("ecma-spec", "en", "https://tc39.es/ecma262/", "Promise objects")
      ]
    ]);

    const result = await runSearchRequest(
      {
        query: "promise",
        docsLocale: "en",
        sources: [
          { id: "mdn-js", name: "MDN JavaScript" },
          { id: "ecma-spec", name: "ECMAScript Specification" }
        ],
        limit: 1
      },
      fixtureFetcher(responses)
    );

    expect(result.records).toHaveLength(1);
    expect(result.facets).toEqual([
      {
        sourceId: "ecma-spec",
        sourceName: "javascript documentation",
        programmingLanguage: "javascript"
      },
      {
        sourceId: "mdn-js",
        sourceName: "javascript documentation",
        programmingLanguage: "javascript"
      }
    ]);
  });

  it("prefers Japanese indexes and truthfully falls back to English", async () => {
    const manifest = {
      schemaVersion: 2,
      generatorVersion: "2",
      catalogSha256: "fixture",
      entries: [
        supportedEntry("python-docs", "python", "ja", "/python.ja.json"),
        supportedEntry("python-docs", "python", "en", "/python.en.json"),
        supportedEntry("rust-docs", "rust", "en", "/rust.en.json")
      ]
    };
    const responses = new Map<string, unknown>([
      ["/search-index/manifest.json", manifest],
      ["/python.ja.json", bundle("python-docs", "ja", "https://docs.python.org/ja/", "リスト")],
      ["/python.en.json", bundle("python-docs", "en", "https://docs.python.org/en/", "List")],
      ["/rust.en.json", bundle("rust-docs", "en", "https://doc.rust-lang.org/", "Iterator")]
    ]);

    const result = await runSearchRequest(
      {
        query: "iterator",
        docsLocale: "ja",
        sources: [
          { id: "python-docs", name: "Python Documentation" },
          { id: "rust-docs", name: "Rust Documentation" }
        ]
      },
      fixtureFetcher(responses)
    );

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      sourceId: "rust-docs",
      docsLocale: "en"
    });
    expect(result.fallbackSources).toEqual([
      {
        id: "rust-docs",
        name: "Rust Documentation",
        requestedLocale: "ja",
        actualLocale: "en"
      }
    ]);
    expect(result.unavailableSources).toEqual([]);
  });

  it("keeps successful results when one bundle fails and retries failed cache entries", async () => {
    const responses = new Map<string, unknown>([
      [
        "/search-index/manifest.json",
        {
          schemaVersion: 2,
          generatorVersion: "2",
          catalogSha256: "fixture",
          entries: [
            supportedEntry("python-docs", "python", "en", "/python.en.json"),
            supportedEntry("rust-docs", "rust", "en", "/rust.en.json")
          ]
        }
      ],
      ["/python.en.json", bundle("python-docs", "en", "https://docs.python.org/", "Iterator")]
    ]);
    let rustAttempts = 0;
    let manifestAttempts = 0;
    let pythonAttempts = 0;
    const fetcher = async (path: string | URL | Request) => {
      if (String(path) === "/search-index/manifest.json") manifestAttempts += 1;
      if (String(path) === "/python.en.json") pythonAttempts += 1;
      if (String(path) === "/rust.en.json") {
        rustAttempts += 1;
        return new Response("unavailable", { status: 503 });
      }
      return fixtureFetcher(responses)(path);
    };
    const cache = new Map();
    const manifestCache = new Map();
    const request = {
      query: "iterator",
      docsLocale: "en",
      sources: [
        { id: "python-docs", name: "Python Documentation" },
        { id: "rust-docs", name: "Rust Documentation" }
      ]
    };

    const first = await runSearchRequest(request, fetcher, cache, manifestCache);
    const second = await runSearchRequest(request, fetcher, cache, manifestCache);

    expect(first.records.map((record) => record.sourceId)).toEqual(["python-docs"]);
    expect(first.failedSources).toEqual([
      {
        id: "rust-docs",
        name: "Rust Documentation",
        docsLocale: "en",
        reason: "Failed to load /rust.en.json: HTTP 503"
      }
    ]);
    expect(second.records.map((record) => record.sourceId)).toEqual(["python-docs"]);
    expect(manifestAttempts).toBe(1);
    expect(pythonAttempts).toBe(1);
    expect(rustAttempts).toBe(2);
  });

  it("isolates a malformed bundle without discarding valid bundle results", async () => {
    const responses = new Map<string, unknown>([
      [
        "/search-index/manifest.json",
        {
          schemaVersion: 2,
          generatorVersion: "2",
          catalogSha256: "fixture",
          entries: [
            supportedEntry("python-docs", "python", "en", "/python.en.json"),
            supportedEntry("rust-docs", "rust", "en", "/rust.en.json")
          ]
        }
      ],
      ["/python.en.json", bundle("python-docs", "en", "https://docs.python.org/", "Iterator")],
      [
        "/rust.en.json",
        {
          ...bundle("rust-docs", "en", "https://doc.rust-lang.org/book/", "Iterator"),
          records: [["Iterator", "../unsafe.html"]]
        }
      ]
    ]);

    const result = await runSearchRequest(
      {
        query: "iterator",
        docsLocale: "en",
        sources: [
          { id: "python-docs", name: "Python Documentation" },
          { id: "rust-docs", name: "Rust Documentation" }
        ]
      },
      fixtureFetcher(responses)
    );

    expect(result.records.map((record) => record.sourceId)).toEqual(["python-docs"]);
    expect(result.failedSources).toEqual([
      expect.objectContaining({
        id: "rust-docs",
        docsLocale: "en",
        reason: "Unsafe search result URL in /rust.en.json"
      })
    ]);
  });
});

function supportedEntry(sourceId: string, language: string, locale: string, path: string) {
  return {
    sourceId,
    sourceName: `${language} documentation`,
    sourceKind: "official",
    programmingLanguage: language,
    docsLocale: locale,
    status: "supported",
    path,
    recordCount: 1
  };
}

function bundle(sourceId: string, locale: string, urlPrefix: string, title: string) {
  return {
    schemaVersion: 2,
    sourceId,
    docsLocale: locale,
    urlPrefix,
    records: [[title, "entry.html"]]
  };
}

function fixtureFetcher(responses: Map<string, unknown>) {
  return async (path: string | URL | Request) =>
    new Response(JSON.stringify(responses.get(String(path))), {
      status: responses.has(String(path)) ? 200 : 404
    });
}
