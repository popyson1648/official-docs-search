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
    expect(result.unavailableSources).toEqual([
      {
        id: "go-docs",
        name: "Go Documentation",
        status: "planned",
        reason: "Guide adapter is planned."
      }
    ]);
  });
});
