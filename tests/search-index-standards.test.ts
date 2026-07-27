import { describe, expect, it } from "vitest";
import {
  extractWg21YearUrls,
  normalizeWg21PaperTables
} from "../scripts/search-index/standards-parsers.mjs";
import { standardsGroupJobs } from "../scripts/search-index/jobs/standards-group.mjs";

describe("standards and proposal search-index jobs", () => {
  it("publishes the WG21 paper archive as an official proposal source", () => {
    expect(standardsGroupJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)).toEqual([
      "wg21-papers/en"
    ]);
  });

  it("keeps direct official paper URLs, lifecycle status, and revisions", () => {
    const records = normalizeWg21PaperTables(
      [{
        url: "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/",
        html: `
          <table>
            <tr><td><a href="p2300r9.html">P2300R9</a></td><td>std::execution and *this</td><td>WG21 authors</td><td>2024-01-01</td><td></td><td></td><td>LEWG</td><td></td></tr>
            <tr><td><a href="p2300r10.html">P2300R10</a></td><td>std::execution</td><td>WG21 authors</td><td>2024-06-28</td><td></td><td></td><td>LEWG</td><td>Adopted 2024-06</td></tr>
            <tr><td><a href="https://example.test/p9999r0.html">P9999R0</a></td><td>Unsafe</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          </table>`
      }],
      {
        sourceId: "wg21-papers",
        programmingLanguage: "cpp",
        docsLocale: "en",
        sourceKind: "official",
        sourceName: "WG21 Papers"
      }
    );

    expect(records.find((record) => record.title.startsWith("P2300R9"))).toEqual(
      expect.objectContaining({
        title: "P2300R9: std::execution and *this",
        proposalStatus: "superseded",
        url: "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2300r9.html"
      })
    );
    expect(records.find((record) => record.title.startsWith("P2300R10"))).toEqual(
      expect.objectContaining({
        proposalStatus: "Adopted 2024-06",
        documentKind: "proposal",
        section: "WG21 authors · 2024-06-28 · LEWG"
      })
    );
    expect(records).toHaveLength(2);
  });

  it("keeps one internally consistent latest row for a repeated identifier", () => {
    const records = normalizeWg21PaperTables(
      [{
        url: "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2016/",
        html: `<table>
          <tr><td><a href="p0304r1.html">P0304R1</a></td><td>Older title</td><td>A</td><td>2016-06-01</td><td></td><td></td><td>CWG</td><td>Adopted 2016-06</td></tr>
          <tr><td><a href="p0304r1.html">P0304R1</a></td><td>Newer title</td><td>B</td><td>2016-11-01</td><td></td><td></td><td>CWG</td><td></td></tr>
        </table>`
      }],
      {
        sourceId: "wg21-papers",
        programmingLanguage: "cpp",
        docsLocale: "en",
        sourceKind: "official",
        sourceName: "WG21 Papers"
      }
    );
    expect(records[0]).toEqual(
      expect.objectContaining({
        title: "P0304R1: Newer title",
        proposalStatus: "unknown",
        section: "B · 2016-11-01 · CWG"
      })
    );
  });

  it("discovers only official year tables", () => {
    expect(
      extractWg21YearUrls(`
        <a href="2026/">2026</a>
        <a href="https://example.test/2025/">unsafe</a>
      `)
    ).toEqual([
      "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2026/"
    ]);
  });
});
