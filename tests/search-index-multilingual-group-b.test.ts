import { describe, expect, it } from "vitest";
import { multilingualGroupBJobs } from "../scripts/search-index/jobs/multilingual-group-b.mjs";
import {
  normalizeJavadocTypes,
  normalizeMdnSearchIndex
} from "../scripts/search-index/parsers-group-b.mjs";

function fixtureLoader(responses: Map<string, string>) {
  return {
    fetchText: async (url: string) => {
      if (!responses.has(url)) throw new Error(`Unexpected fixture URL: ${url}`);
      return responses.get(url);
    }
  };
}

describe("multilingual group B search-index jobs", () => {
  it("exports only unique source and locale jobs with complete gates", () => {
    expect(multilingualGroupBJobs).toHaveLength(10);
    const keys = multilingualGroupBJobs.map(
      (job: { sourceId: string; docsLocale: string }) => `${job.sourceId}/${job.docsLocale}`
    );
    expect(new Set(keys).size).toBe(keys.length);
    for (const job of multilingualGroupBJobs as Array<Record<string, any>>) {
      expect(job.minimumRecords).toBeGreaterThan(0);
      expect(job.knownQueries.length).toBeGreaterThan(0);
      expect(job.urlPrefix).toMatch(/^https:\/\//);
      expect(job.licenseUrl).toMatch(/^https:\/\//);
    }
  });

  it("loads the Japanese Javadoc package and type fixtures", async () => {
    const job = multilingualGroupBJobs.find(
      (candidate: Record<string, any>) =>
        candidate.sourceId === "java-docs" && candidate.docsLocale === "ja"
    );
    expect(job).toBeDefined();
    if (!job) throw new Error("Missing Java Japanese fixture job.");
    const records = await job.load(
      fixtureLoader(
        new Map([
          [
            `${job.urlPrefix}package-search-index.js`,
            'packageSearchIndex = [{"m":"java.base","l":"java.lang"}]; updateSearchResults();'
          ],
          [
            `${job.urlPrefix}type-search-index.js`,
            'typeSearchIndex = [{"p":"java.lang","l":"String"}]; updateSearchResults();'
          ]
        ])
      )
    );

    expect(records).toEqual([
      {
        title: "java.lang",
        url: `${job.urlPrefix}java.base/java/lang/package-summary.html`,
        section: "java.base"
      },
      {
        title: "String",
        url: `${job.urlPrefix}java.base/java/lang/String.html`,
        section: "java.lang"
      }
    ]);
  });

  it("loads localized Sphinx titles and encodes their fragments", async () => {
    const job = multilingualGroupBJobs.find(
      (candidate: Record<string, any>) =>
        candidate.sourceId === "solidity-docs-ja" && candidate.docsLocale === "ja"
    );
    expect(job).toBeDefined();
    if (!job) throw new Error("Missing Solidity Japanese fixture job.");
    const records = await job.load(
      fixtureLoader(
        new Map([
          [
            `${job.urlPrefix}searchindex.js`,
            'Search.setIndex({"docnames":["types"],"titles":["型"],"alltitles":{"マッピング型":[[0,"mapping-types"]]}});'
          ]
        ])
      )
    );

    expect(records.map(({ title, url }: { title: string; url: string }) => ({ title, url }))).toEqual([
      { title: "型", url: `${job.urlPrefix}types.html` },
      {
        title: "マッピング型",
        url: `${job.urlPrefix}types.html#mapping-types`
      }
    ]);
  });

  it("loads and scopes the public MDN locale index", async () => {
    const job = multilingualGroupBJobs.find(
      (candidate: Record<string, any>) =>
        candidate.sourceId === "html-mdn" && candidate.docsLocale === "ja"
    );
    expect(job).toBeDefined();
    if (!job) throw new Error("Missing MDN HTML Japanese fixture job.");
    const records = await job.load(
      fixtureLoader(
        new Map([
          [
            "https://developer.mozilla.org/ja/search-index.json",
            JSON.stringify([
              { title: "HTML", url: "/ja/docs/Web/HTML" },
              { title: "入力要素", url: "/ja/docs/Web/HTML/Reference/Elements/input" },
              { title: "CSS", url: "/ja/docs/Web/CSS" }
            ])
          ]
        ])
      )
    );

    expect(records.map(({ title, url }: { title: string; url: string }) => ({ title, url }))).toEqual([
      { title: "HTML", url: "https://developer.mozilla.org/ja/docs/Web/HTML" },
      {
        title: "入力要素",
        url: "https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Elements/input"
      }
    ]);
  });

  it("rejects malformed structured upstream input", () => {
    expect(() =>
      normalizeMdnSearchIndex("{}", {
        urlPrefix: "https://developer.mozilla.org/ja/docs/Web/HTML"
      })
    ).toThrow(/Invalid MDN/);
    expect(() =>
      normalizeJavadocTypes("not an index", "also not an index", {
        urlPrefix: "https://docs.oracle.com/javase/jp/25/docs/api/"
      })
    ).toThrow(/Invalid Javadoc/);
  });
});
