import { describe, expect, it } from "vitest";
import {
  assertZigGuideVersion,
  normalizeAdvancedRBookToc,
  normalizeTrustedRss,
  normalizeTrustedSitemap,
  sectionFromPath,
  titleFromUrl
} from "../scripts/search-index/trusted-community-group-b-parsers.mjs";
import { trustedCommunityGroupBJobs } from "../scripts/search-index/jobs/trusted-community-group-b.mjs";

describe("trusted community group B search-index jobs", () => {
  it("exports six qualified English metadata-only jobs with safety gates", () => {
    expect(
      trustedCommunityGroupBJobs.map(
        (job) => `${job.sourceId}/${job.docsLocale}`
      )
    ).toEqual([
      "elixir-school/en",
      "learn-you-a-haskell/en",
      "advanced-r/en",
      "clojure-guides/en",
      "fsharp-for-fun-and-profit/en",
      "zig-guide/en"
    ]);

    for (const job of trustedCommunityGroupBJobs) {
      expect(["community", "conventional"]).toContain(job.sourceKind);
      expect(job.minimumRecords).toBeGreaterThan(0);
      expect(job.knownQueries.length).toBeGreaterThan(0);
      expect(job.urlPrefix).toMatch(/^https:\/\//);
      expect(job.licenseUrl).toMatch(/^https:\/\//);
      expect(job.updateFrequency).toMatch(/^(weekly|monthly)$/);
      expect(job.qualification).toBeTruthy();
      expect(job.maximumRecordDropRatio).toBe(0.2);
      expect(job.maximumSizeChangeRatio).toBe(0.5);
    }
  });

  it("normalizes only reviewed sitemap routes into minimal metadata", () => {
    const records = normalizeTrustedSitemap(
      `
        <urlset>
          <url><loc>https://guide.example.test/en/lessons/basics/pattern_matching</loc></url>
          <url><loc>https://guide.example.test/en/lessons/advanced/otp_supervisors?ref=nav</loc></url>
          <url><loc>https://guide.example.test/blog/not-a-lesson</loc></url>
          <url><loc>https://evil.example.test/en/lessons/basics/functions</loc></url>
        </urlset>
      `,
      {
        label: "Example Guide",
        urlPrefix: "https://guide.example.test/en/lessons/",
        acceptUrl: () => true,
        sectionFromUrl: (url: URL) => sectionFromPath(url, 2)
      }
    );

    expect(records).toEqual([
      {
        title: "Pattern Matching",
        url: "https://guide.example.test/en/lessons/basics/pattern_matching",
        section: "Basics"
      },
      {
        title: "OTP Supervisors",
        url: "https://guide.example.test/en/lessons/advanced/otp_supervisors",
        section: "Advanced"
      }
    ]);
    expect(Object.keys(records[0])).toEqual(["title", "url", "section"]);
  });

  it("extracts chapter metadata and book parts from a Bookdown TOC", () => {
    const records = normalizeAdvancedRBookToc(
      `
        <ul class="book-toc list-unstyled">
          <li><a href="index.html">Welcome</a></li>
          <li class="book-part">Foundations</li>
          <li><a href="names-values.html"><span>2</span> Names and values</a></li>
          <li><a href="https://other.example.test/copied.html">Outside</a></li>
          <li class="book-part">Metaprogramming</li>
          <li><a href="expressions.html"><span>18</span> Expressions</a></li>
        </ul>
      `,
      { urlPrefix: "https://adv-r.example.test/" }
    );

    expect(records).toEqual([
      {
        title: "Welcome",
        url: "https://adv-r.example.test/index.html",
        section: "Advanced R"
      },
      {
        title: "Names and values",
        url: "https://adv-r.example.test/names-values.html",
        section: "Foundations"
      },
      {
        title: "Expressions",
        url: "https://adv-r.example.test/expressions.html",
        section: "Metaprogramming"
      }
    ]);
  });

  it("derives searchable titles while retaining common language abbreviations", () => {
    expect(
      titleFromUrl(new URL("https://example.test/posts/fsharp-in-60-seconds/"))
    ).toBe("F# In 60 Seconds");
    expect(
      titleFromUrl(
        new URL("https://example.test/en/lessons/advanced/otp_supervisors")
      )
    ).toBe("OTP Supervisors");
    expect(
      titleFromUrl(
        new URL("https://example.test/articles/language/namespaces/index.html")
      )
    ).toBe("Namespaces");
  });

  it("uses actual F# feed titles instead of URL-derived abbreviations", () => {
    const records = normalizeTrustedRss(
      `<rss><channel>
        <item>
          <title>The EDFH is defeated once again</title>
          <link>https://fsharpforfunandprofit.com/posts/return-of-the-edfh-3/</link>
        </item>
        <item>
          <title>The &#39;dependency cycle&#39; series</title>
          <link>https://fsharpforfunandprofit.com/series/dependency-cycle/</link>
        </item>
      </channel></rss>`,
      {
        label: "F# for Fun and Profit",
        urlPrefix: "https://fsharpforfunandprofit.com/",
        acceptUrl: () => true,
        sectionFromUrl: (url: URL) => sectionFromPath(url, 0)
      }
    );

    expect(records.map((record) => record.title)).toEqual([
      "The EDFH is defeated once again",
      "The 'dependency cycle' series"
    ]);
  });

  it("stops before relabeling a newer zig.guide edition as Zig 0.15.2", () => {
    expect(() =>
      assertZigGuideVersion(
        '<span class="theme-doc-version-badge">Version: Zig 0.15.2</span>',
        "0.15.2"
      )
    ).not.toThrow();
    expect(() =>
      assertZigGuideVersion(
        '<span class="theme-doc-version-badge">Version: Zig 0.16.0</span>',
        "0.15.2"
      )
    ).toThrow(/version changed/);
  });

  it("rejects malformed or entirely out-of-scope upstream inputs", () => {
    expect(() =>
      normalizeTrustedSitemap("<html>not a sitemap</html>", {
        label: "Example",
        urlPrefix: "https://example.test/docs/",
        acceptUrl: () => true
      })
    ).toThrow(/Invalid Example sitemap/);
    expect(() =>
      normalizeTrustedSitemap(
        "<urlset><url><loc>https://evil.test/docs/page</loc></url></urlset>",
        {
          label: "Example",
          urlPrefix: "https://example.test/docs/",
          acceptUrl: () => true
        }
      )
    ).toThrow(/no reviewed documentation URLs/);
    expect(() =>
      normalizeAdvancedRBookToc("<ul><li>Missing TOC</li></ul>", {
        urlPrefix: "https://adv-r.example.test/"
      })
    ).toThrow(/Advanced R book table of contents/);
  });

  it("loads exactly one stable primary input for every job", async () => {
    const calls: string[] = [];
    const sitemap = (url: string) =>
      `<urlset><url><loc>${url}</loc></url></urlset>`;
    const fixtures = [
      sitemap("https://elixirschool.com/en/lessons/basics/pattern_matching"),
      sitemap("https://learnyouahaskell.github.io/introduction.html"),
      `
        <ul class="book-toc">
          <li><a href="introduction.html">1 Introduction</a></li>
        </ul>
      `,
      sitemap(
        "https://clojure-doc.org/articles/language/namespaces/index.html"
      ),
      `<rss><channel><item>
        <title>F# syntax in 60 seconds</title>
        <link>https://fsharpforfunandprofit.com/posts/fsharp-in-60-seconds/</link>
      </item></channel></rss>`,
      sitemap("https://zig.guide/language-basics/comptime")
    ];

    for (const [index, job] of trustedCommunityGroupBJobs.entries()) {
      const records = await job.load({
        fetchText: async (url: string) => {
          calls.push(url);
          if (url === "https://zig.guide/") {
            return '<span class="theme-doc-version-badge">Version: Zig 0.15.2</span>';
          }
          return fixtures[index];
        }
      });
      expect(records).toHaveLength(1);
      expect(Object.keys(records[0]).sort()).toEqual(
        ["section", "title", "url"].sort()
      );
    }

    expect(calls).toEqual([
      "https://elixirschool.com/sitemap.xml",
      "https://learnyouahaskell.github.io/sitemap.xml",
      "https://adv-r.hadley.nz/",
      "https://clojure-doc.org/sitemap.xml",
      "https://fsharpforfunandprofit.com/index.xml",
      "https://zig.guide/",
      "https://zig.guide/sitemap.xml"
    ]);
  });
});
