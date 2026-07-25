import { describe, expect, it } from "vitest";
import { trustedCommunityGroupCJobs } from "../scripts/search-index/jobs/trusted-community-group-c.mjs";
import {
  canonicalizeWebDevCourseInput,
  normalizeCommonLispCookbookIndex,
  normalizeCornellOcamlSearchIndex,
  normalizeProgrammingInDToc,
  normalizeSolidityByExampleSearch,
  normalizeWebDevCourse
} from "../scripts/search-index/trusted-community-group-c-parsers.mjs";

describe("trusted community group C search-index jobs", () => {
  it("exports six qualified English jobs with complete safety metadata", () => {
    expect(
      trustedCommunityGroupCJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)
    ).toEqual([
      "programming-in-d/en",
      "cornell-ocaml/en",
      "solidity-by-example/en",
      "common-lisp-cookbook/en",
      "webdev-html/en",
      "webdev-css/en"
    ]);
    expect(trustedCommunityGroupCJobs.map((job) => job.sourceKind)).toEqual([
      "conventional",
      "conventional",
      "community",
      "community",
      "conventional",
      "conventional"
    ]);

    for (const job of trustedCommunityGroupCJobs) {
      expect(job.minimumRecords).toBeGreaterThan(0);
      expect(job.knownQueries.length).toBeGreaterThan(0);
      expect(job.urlPrefix).toMatch(/^https:\/\//);
      expect(job.licenseUrl).toMatch(/^https:\/\//);
      expect(job.updateFrequency).toMatch(/^(weekly|monthly)$/);
      expect(job.qualification).toMatch(/however/i);
      expect(job.sourceKind).toMatch(/^(community|conventional)$/);
    }
  });

  it("normalizes only in-scope Programming in D chapter links", () => {
    const options = fixtureOptions({
      inputUrl: "https://ddili.example.test/d.en/index.html",
      urlPrefix: "https://ddili.example.test/d.en/"
    });
    expect(
      normalizeProgrammingInDToc(
        `
          <a href="/d.en/index.html">Programming in D</a>
          <a href="/d.en/ranges.html">42. Ranges</a>
          <a href="/d.en/concurrency.html">Message Passing Concurrency</a>
          <a href="https://outside.example.test/chapter.html">Outside</a>
          <a href="/d.en/next.html">[ Next ↣ ]</a>
        `,
        options
      )
    ).toEqual([
      expect.objectContaining({
        title: "Ranges",
        url: "https://ddili.example.test/d.en/ranges.html"
      }),
      expect.objectContaining({
        title: "Message Passing Concurrency",
        url: "https://ddili.example.test/d.en/concurrency.html"
      })
    ]);
  });

  it("normalizes scoped Sphinx pages and strips markup from Cornell titles", () => {
    const records = normalizeCornellOcamlSearchIndex(
      `Search.setIndex({
        "docnames":["chapters/basics/pattern_matching","../outside"],
        "titles":["<span class=\\"section-number\\">3.1. </span>Pattern Matching","Outside"]
      });`,
      fixtureOptions({
        baseUrl: "https://cs.example.test/textbook/",
        urlPrefix: "https://cs.example.test/textbook/"
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "Pattern Matching",
        url: "https://cs.example.test/textbook/chapters/basics/pattern_matching.html"
      })
    ]);
  });

  it("deduplicates Solidity paths and assigns useful sections", () => {
    const records = normalizeSolidityByExampleSearch(
      JSON.stringify({
        delegatecall: ["/delegatecall", "/delegatecall"],
        security: ["/hacks/re-entrancy"],
        invalid: ["https://outside.example.test/escape"]
      }),
      fixtureOptions({
        baseUrl: "https://solidity.example.test/",
        urlPrefix: "https://solidity.example.test/"
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "Delegatecall",
        url: "https://solidity.example.test/delegatecall",
        section: "Solidity examples"
      }),
      expect.objectContaining({
        title: "Re Entrancy",
        url: "https://solidity.example.test/hacks/re-entrancy",
        section: "Security examples"
      })
    ]);
  });

  it("parses only local Common Lisp Cookbook HTML targets", () => {
    const records = normalizeCommonLispCookbookIndex(
      `
        * [Getting started](getting-started.html)
        * [format](strings.html#string-formatting-format)
        * [Outside](https://outside.example.test/page.html)
      `,
      fixtureOptions({
        baseUrl: "https://lisp.example.test/cl-cookbook/",
        urlPrefix: "https://lisp.example.test/cl-cookbook/"
      })
    );

    expect(records.map(({ title, url }) => [title, url])).toEqual([
      [
        "Getting started",
        "https://lisp.example.test/cl-cookbook/getting-started.html"
      ],
      [
        "format",
        "https://lisp.example.test/cl-cookbook/strings.html#string-formatting-format"
      ]
    ]);
  });

  it("derives searchable web.dev course titles from reviewed course routes", () => {
    const records = normalizeWebDevCourse(
      `
        <a href="#main-content">Skip</a>
        <a href="/learn/css/the-cascade">Read article</a>
        <a href="/learn/css/container-queries">Read article</a>
        <a href="/learn/css/quiz">Take the quiz</a>
        <a href="/learn/html/semantic-html">Other course</a>
      `,
      fixtureOptions({
        inputUrl: "https://web.example.test/learn/css/",
        urlPrefix: "https://web.example.test/learn/css/"
      })
    );

    expect(records.map(({ title, url }) => [title, url])).toEqual([
      ["The Cascade", "https://web.example.test/learn/css/the-cascade"],
      [
        "Container Queries",
        "https://web.example.test/learn/css/container-queries"
      ]
    ]);
  });

  it("canonicalizes web.dev course links independently of nonce and feature order", () => {
    const options = fixtureOptions({
      inputUrl: "https://web.example.test/learn/css/",
      urlPrefix: "https://web.example.test/learn/css/"
    });
    const first = canonicalizeWebDevCourseInput(
      `<script nonce="one">["a","b"]</script>
       <a href="/learn/css/container-queries">Container queries</a>
       <a href="/learn/css/the-cascade">Cascade</a>`,
      options
    );
    const second = canonicalizeWebDevCourseInput(
      `<script nonce="two">["b","a"]</script>
       <a href="/learn/css/the-cascade">Cascade</a>
       <a href="/learn/css/container-queries">Container queries</a>`,
      options
    );

    expect(second).toBe(first);
    expect(first).not.toContain("nonce");
    expect(first).not.toContain("feature");
  });

  it("rejects malformed primary inputs", () => {
    expect(() =>
      normalizeProgrammingInDToc("<main>No links</main>", fixtureOptions())
    ).toThrow(/Invalid Programming in D/);
    expect(() =>
      normalizeCornellOcamlSearchIndex("not json", fixtureOptions())
    ).toThrow(/Invalid Sphinx/);
    expect(() =>
      normalizeSolidityByExampleSearch("[]", fixtureOptions())
    ).toThrow(/Invalid Solidity by Example/);
    expect(() =>
      normalizeCommonLispCookbookIndex("# No links", fixtureOptions())
    ).toThrow(/Invalid Common Lisp Cookbook/);
    expect(() =>
      normalizeWebDevCourse("<main>No links</main>", fixtureOptions())
    ).toThrow(/Invalid web.dev/);
  });

  it("loads only the reviewed primary input for each source", async () => {
    const calls: string[] = [];
    const fixtures = [
      '<a href="/ders/d.en/ranges.html">Ranges</a>',
      'Search.setIndex({"docnames":["chapters/basics/pattern_matching"],"titles":["Pattern Matching"]});',
      '{ "delegatecall": ["/delegatecall"] }',
      "* [Functions](functions.html)",
      '<a href="/learn/html/semantic-html">Read article</a>',
      '<a href="/learn/css/the-cascade">Read article</a>'
    ];

    for (const [position, job] of trustedCommunityGroupCJobs.entries()) {
      const records = await job.load({
        fetchText: async (url: string) => {
          calls.push(url);
          return fixtures[position];
        }
      });
      expect(records).toHaveLength(1);
      expect(records[0].url).toMatch(new RegExp(`^${escape(job.urlPrefix)}`));
    }

    expect(calls).toEqual([
      "https://ddili.org/ders/d.en/index.html",
      "https://cs3110.github.io/textbook/searchindex.js",
      "https://raw.githubusercontent.com/Cyfrin/solidity-by-example.github.io/gh-pages/src/search.json",
      "https://raw.githubusercontent.com/LispCookbook/cl-cookbook/master/index.md",
      "https://web.dev/learn/html/",
      "https://web.dev/learn/css/"
    ]);
  });
});

function fixtureOptions(overrides = {}) {
  return {
    inputUrl: "https://docs.example.test/",
    baseUrl: "https://docs.example.test/",
    urlPrefix: "https://docs.example.test/",
    sourceId: "example",
    programmingLanguage: "example",
    sourceKind: "community",
    sourceName: "Example",
    ...overrides
  };
}

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
