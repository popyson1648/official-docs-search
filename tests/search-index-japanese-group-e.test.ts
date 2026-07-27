import { describe, expect, it } from "vitest";
import { japaneseGroupEJobs } from "../scripts/search-index/jobs/japanese-group-e.mjs";
import { normalizeScopedHtmlLinks } from "../scripts/search-index/japanese-group-e-parsers.mjs";

describe("Japanese group E search-index jobs", () => {
  it("exports the assigned locale-specific jobs", () => {
    expect(japaneseGroupEJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)).toEqual([
      "cppreference-c/ja",
      "cpprefjp/ja",
      "cppreference-cpp/ja",
      "go-docs/en"
    ]);
    expect(
      japaneseGroupEJobs.every(
        (job) =>
          job.minimumRecords > 0 &&
          job.knownQueries.length > 0 &&
          job.licenseUrl.startsWith("https://")
      )
    ).toBe(true);
  });

  it("keeps only links inside the exact path boundary", () => {
    const records = normalizeScopedHtmlLinks(
      `
        <a href="/c/language">C language</a>
        <a href="/c/library#atomic">Atomic support</a>
        <a href="/cpp/language">C++ language</a>
        <a href="https://other.example.test/c">Other site</a>
      `,
      fixtureOptions()
    );

    expect(records.map(({ title, url }) => [title, url])).toEqual([
      ["C language", "https://docs.example.test/c/language"],
      ["Atomic support", "https://docs.example.test/c/library#atomic"]
    ]);
  });

  it("preserves the actual content locale and source classification", () => {
    const records = normalizeScopedHtmlLinks('<a href="/c/types">型サポート</a>', {
      ...fixtureOptions(),
      docsLocale: "ja",
      sourceKind: "community",
      section: "Partial Japanese translation"
    });

    expect(records).toEqual([
      expect.objectContaining({
        title: "型サポート",
        docsLocale: "ja",
        sourceKind: "community",
        section: "Partial Japanese translation"
      })
    ]);
  });

  it("deduplicates repeated navigation links", () => {
    const records = normalizeScopedHtmlLinks(
      '<a href="/c/types">Types</a><a href="/c/types">Type support</a>',
      fixtureOptions()
    );

    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Types");
  });
});

function fixtureOptions() {
  return {
    sourceId: "example-docs",
    programmingLanguage: "c",
    docsLocale: "en",
    sourceKind: "official",
    sourceName: "Example Documentation",
    inputUrl: "https://docs.example.test/c",
    urlRoot: "https://docs.example.test/c"
  };
}
