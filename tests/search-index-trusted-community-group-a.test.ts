import { describe, expect, it } from "vitest";
import {
  normalizeAnchoredMarkdownHeadings,
  normalizeGitBookSummary,
  normalizeGoByExampleToc,
  normalizeHtmlHeadings,
  normalizeJavascriptInfoToc,
  normalizeMarkdownSummary
} from "../scripts/search-index/trusted-community-group-a-parsers.mjs";
import { trustedCommunityGroupAJobs } from "../scripts/search-index/jobs/trusted-community-group-a.mjs";

describe("trusted community group A search-index jobs", () => {
  it("exports six qualified English metadata-only jobs", () => {
    expect(
      trustedCommunityGroupAJobs.map(
        (job) => `${job.sourceId}/${job.docsLocale}`
      )
    ).toEqual([
      "comprehensive-rust/en",
      "javascript-info/en",
      "typescript-deep-dive/en",
      "go-by-example/en",
      "cpp-core-guidelines/en",
      "php-the-right-way/en"
    ]);
    expect(
      trustedCommunityGroupAJobs.every(
        (job) =>
          job.minimumRecords > 0 &&
          job.knownQueries.length > 0 &&
          job.attribution.length > 0 &&
          job.licenseUrl.startsWith("https://") &&
          job.qualification.includes("however") &&
          job.qualificationJa.includes("ただし") &&
          ["weekly", "monthly"].includes(job.updateFrequency)
      )
    ).toBe(true);
  });

  it("maps an mdBook summary to course pages without retaining body text", () => {
    const records = normalizeMarkdownSummary(
      `# Day 1
- [Welcome](index.md)
  - [Borrowing](borrowing.md#shared)

This paragraph is body text and must not become a record.`,
      fixture({
        sourceId: "comprehensive-rust",
        sourceName: "Comprehensive Rust",
        buildUrl: (path: string) =>
          `https://course.example/${path.replace(/\.md(?=#|$)/, ".html")}`
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "Welcome",
        url: "https://course.example/index.html",
        section: "Day 1"
      }),
      expect.objectContaining({
        title: "Borrowing",
        url: "https://course.example/borrowing.html#shared",
        section: "Day 1"
      })
    ]);
    expect(JSON.stringify(records)).not.toContain("body text");
  });

  it("pairs GitBook summary titles with its reviewed sitemap order", () => {
    const records = normalizeGitBookSummary(
      `# Summary
* [Getting Started](docs/getting-started.md)
  * [Why TypeScript](docs/why-typescript.md)`,
      `<urlset>
        <url><loc>https://book.example/typescript</loc></url>
        <url><loc>https://book.example/typescript/getting-started</loc></url>
        <url><loc>https://book.example/typescript/getting-started/why-typescript</loc></url>
      </urlset>`,
      {
        ...fixture({
          sourceId: "typescript-deep-dive",
          sourceName: "TypeScript Deep Dive"
        }),
        baseUrl: "https://book.example/typescript"
      }
    );

    expect(records.map(({ title, url, section }) => [title, url, section])).toEqual([
      [
        "TypeScript Deep Dive",
        "https://book.example/typescript",
        "TypeScript Deep Dive"
      ],
      [
        "Getting Started",
        "https://book.example/typescript/getting-started",
        "Getting Started"
      ],
      [
        "Why TypeScript",
        "https://book.example/typescript/getting-started/why-typescript",
        "Getting Started"
      ]
    ]);
  });

  it("keeps only reviewed single-page JavaScript tutorial links", () => {
    const records = normalizeJavascriptInfoToc(
      `<a href="/async-await">Async/await</a>
       <a href="/event-loop">Event loop: microtasks and macrotasks</a>
       <a href="/terms">Terms</a>
       <a href="/tutorial/map">Map</a>
       <a href="https://evil.example/async-await">Wrong host</a>`,
      {
        ...fixture({ sourceName: "The Modern JavaScript Tutorial" }),
        baseUrl: "https://javascript.info/"
      }
    );

    expect(
      records.map((entry: { title: string; url: string }) => [
        entry.title,
        entry.url
      ])
    ).toEqual([
      ["Async/await", "https://javascript.info/async-await"],
      [
        "Event loop: microtasks and macrotasks",
        "https://javascript.info/event-loop"
      ]
    ]);
  });

  it("keeps only Go example pages on the source origin", () => {
    const records = normalizeGoByExampleToc(
      `<a href="hello-world">first example</a>
       <a href="hello-world">Hello World</a>
       <a href="goroutines">Goroutines</a>
       <a href="/json">JSON</a>
       <a href="https://go.dev/doc/">Official docs</a>`,
      {
        ...fixture({ sourceName: "Go by Example" }),
        baseUrl: "https://gobyexample.com/"
      }
    );

    expect(
      records.map((entry: { title: string; url: string }) => [
        entry.title,
        entry.url
      ])
    ).toEqual([
      ["Hello World", "https://gobyexample.com/hello-world"],
      ["Goroutines", "https://gobyexample.com/goroutines"],
      ["JSON", "https://gobyexample.com/json"]
    ]);
  });

  it("extracts only explicitly anchored C++ guideline headings", () => {
    const records = normalizeAnchoredMarkdownHeadings(
      `# <a name="main"></a>C++ Core Guidelines
## <a name="s-philosophy"></a>P: Philosophy
### <a name="rp-mutable"></a>P.10: Prefer immutable data to mutable data

Body prose must not be retained.`,
      {
        ...fixture({ sourceName: "C++ Core Guidelines" }),
        baseUrl: "https://guidelines.example/CppCoreGuidelines"
      }
    );

    expect(
      records.map((entry: { title: string; url: string }) => [
        entry.title,
        entry.url
      ])
    ).toEqual([
      [
        "C++ Core Guidelines",
        "https://guidelines.example/CppCoreGuidelines#main"
      ],
      [
        "P: Philosophy",
        "https://guidelines.example/CppCoreGuidelines#s-philosophy"
      ],
      [
        "P.10: Prefer immutable data to mutable data",
        "https://guidelines.example/CppCoreGuidelines#rp-mutable"
      ]
    ]);
    expect(JSON.stringify(records)).not.toContain("Body prose");
  });

  it("indexes PHP heading text and anchors without article bodies", () => {
    const records = normalizeHtmlHeadings(
      `<h1 id="dependency_injection_title">Dependency Injection</h1>
       <p>This body should never be retained.</p>
       <h2 id="containers_title">Containers</h2>`,
      {
        ...fixture({ sourceName: "PHP: The Right Way" }),
        baseUrl: "https://php.example/"
      }
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "Dependency Injection",
        url: "https://php.example/#dependency_injection_title",
        section: "Dependency Injection"
      }),
      expect.objectContaining({
        title: "Containers",
        url: "https://php.example/#containers_title",
        section: "Dependency Injection"
      })
    ]);
    expect(JSON.stringify(records)).not.toContain("This body");
  });

  it("rejects malformed or out-of-scope structured inputs", () => {
    expect(() =>
      normalizeMarkdownSummary("No links", fixture({ buildUrl: () => "" }))
    ).toThrow(/Markdown summary/);
    expect(() =>
      normalizeGitBookSummary(
        "* [One](one.md)",
        "<urlset><loc>https://book.example/typescript</loc></urlset>",
        {
          ...fixture(),
          baseUrl: "https://book.example/typescript"
        }
      )
    ).toThrow(/GitBook index/);
    expect(() =>
      normalizeGitBookSummary(
        "* [One](one.md)",
        `<urlset>
          <loc>https://book.example/typescript</loc>
          <loc>https://evil.example/one</loc>
        </urlset>`,
        {
          ...fixture(),
          baseUrl: "https://book.example/typescript"
        }
      )
    ).toThrow(/outside the reviewed scope/);
    expect(() =>
      normalizeAnchoredMarkdownHeadings("Body only", {
        ...fixture(),
        baseUrl: "https://guidelines.example/"
      })
    ).toThrow(/anchored Markdown/);
    expect(() =>
      normalizeHtmlHeadings('<h2 id="unsafe/id">Unsafe</h2>', {
        ...fixture(),
        baseUrl: "https://php.example/"
      })
    ).toThrow(/Unsafe heading identifier/);
  });
});

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: "example-source",
    programmingLanguage: "example",
    sourceName: "Example Source",
    sourceKind: "conventional",
    buildUrl: (path: string) => `https://example.test/${path}`,
    ...overrides
  };
}
