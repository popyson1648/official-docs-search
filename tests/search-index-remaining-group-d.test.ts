import { describe, expect, it } from "vitest";
import { remainingGroupDJobs } from "../scripts/search-index/jobs/remaining-group-d.mjs";
import {
  normalizeDartdocIndex,
  normalizeDoccNavigator,
  normalizeElmPackages,
  normalizeSitemap
} from "../scripts/search-index/parsers-group-d.mjs";

describe("remaining group D adapters", () => {
  it("exports unique and gated source-locale jobs", () => {
    expect(remainingGroupDJobs).toHaveLength(14);
    const keys = remainingGroupDJobs.map(
      (job: { sourceId: string; docsLocale: string }) => `${job.sourceId}/${job.docsLocale}`
    );
    expect(new Set(keys).size).toBe(keys.length);
    for (const job of remainingGroupDJobs as Array<Record<string, any>>) {
      expect(job.minimumRecords).toBeGreaterThan(0);
      expect(job.knownQueries.length).toBeGreaterThan(0);
      expect(job.urlPrefix).toMatch(/^https:\/\//);
      expect(job.licenseUrl).toMatch(/^https:\/\//);
    }
  });

  it("normalizes a nested DocC navigator without group markers", () => {
    expect(
      normalizeDoccNavigator(
        JSON.stringify({
          interfaceLanguages: {
            swift: [
              {
                children: [
                  { title: "Language Guide", type: "groupMarker" },
                  {
                    title: "Concurrency",
                    type: "article",
                    path: "/documentation/the-swift-programming-language/concurrency"
                  }
                ]
              }
            ]
          }
        }),
        { urlPrefix: "https://docs.swift.org/swift-book/" }
      )
    ).toEqual([
      {
        title: "Concurrency",
        url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency",
        section: "Language Guide"
      }
    ]);
  });

  it("scopes sitemap records and creates readable titles", () => {
    const records = normalizeSitemap(
      "<urlset><url><loc>https://dart.dev/language/pattern-types</loc></url>" +
        "<url><loc>https://dart.dev/community</loc></url></urlset>",
      {
        fallbackTitle: "Dart Documentation",
        acceptUrl: (url: string) => new URL(url).pathname.startsWith("/language")
      }
    );
    expect(records).toEqual([
      { title: "Pattern Types", url: "https://dart.dev/language/pattern-types" }
    ]);
  });

  it("excludes Kotlin's production-inaccessible test fixture", async () => {
    const job = remainingGroupDJobs.find(
      (candidate: { sourceId: string; docsLocale: string }) =>
        candidate.sourceId === "kotlin-docs" && candidate.docsLocale === "en"
    ) as Record<string, any>;
    const records = await job.load({
      fetchText: async () =>
        "<urlset>" +
        "<url><loc>https://kotlinlang.org/docs/coroutines-guide.html</loc></url>" +
        "<url><loc>https://kotlinlang.org/docs/test-page.html</loc></url>" +
        "</urlset>"
    });

    expect(records).toEqual([
      {
        title: "Coroutines Guide",
        url: "https://kotlinlang.org/docs/coroutines-guide.html"
      }
    ]);
  });

  it("normalizes Dartdoc and Elm package structured indexes", () => {
    expect(
      normalizeDartdocIndex(
        JSON.stringify([
          {
            name: "Future",
            qualifiedName: "dart:async.Future",
            href: "dart-async/Future-class.html",
            enclosedBy: { name: "dart:async" }
          }
        ]),
        { urlPrefix: "https://api.dart.dev/" }
      )
    ).toEqual([
      {
        title: "dart:async.Future",
        url: "https://api.dart.dev/dart-async/Future-class.html",
        section: "dart:async"
      }
    ]);

    expect(
      normalizeElmPackages('{"elm/core":["1.0.0","1.0.5"]}', {
        urlPrefix: "https://package.elm-lang.org/packages/"
      })
    ).toEqual([
      {
        title: "elm/core",
        url: "https://package.elm-lang.org/packages/elm/core/1.0.5/",
        section: "1.0.5"
      }
    ]);
  });

  it("uses stable Oracle MySQL inputs while preserving original dev.mysql.com links", async () => {
    const job = remainingGroupDJobs.find(
      (candidate: { sourceId: string; docsLocale: string }) =>
        candidate.sourceId === "mysql-docs" && candidate.docsLocale === "en"
    ) as Record<string, any>;
    let inputUrl = "";
    const records = await job.load({
      fetchText: async (url: string) => {
        inputUrl = url;
        return '<a href="sql-statements.html">SQL Statements</a>';
      }
    });

    expect(inputUrl).toBe(
      "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/index.html"
    );
    expect(records).toEqual([
      {
        title: "SQL Statements",
        url: "https://dev.mysql.com/doc/refman/8.4/en/sql-statements.html"
      }
    ]);
  });

  it("rejects malformed structured indexes", () => {
    expect(() =>
      normalizeDartdocIndex("{}", { urlPrefix: "https://api.dart.dev/" })
    ).toThrow(/Invalid Dartdoc/);
    expect(() =>
      normalizeElmPackages("[]", {
        urlPrefix: "https://package.elm-lang.org/packages/"
      })
    ).toThrow(/Invalid Elm package/);
  });
});
