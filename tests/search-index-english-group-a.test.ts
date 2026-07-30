import { describe, expect, it } from "vitest";
import {
  findExDocSidebarUrl,
  normalizeBashDevdocs,
  normalizeDocumenterSearchIndex,
  normalizeExDocSidebar,
  normalizePerlDevdocs,
  normalizeSitemap,
  titleFromUrl
} from "../scripts/search-index/english-group-a-parsers.mjs";
import {
  canonicalizeGroovyDocumentationUrl,
  englishGroupAJobs
} from "../scripts/search-index/jobs/english-group-a.mjs";

describe("English group A search-index jobs", () => {
  it("exports one English job for every assigned source", () => {
    expect(englishGroupAJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)).toEqual([
      "cppreference-c/en",
      "cppreference-cpp/en",
      "bash-manual/en",
      "clojure-docs/en",
      "elixir-docs/en",
      "erlang-docs/en",
      "groovy-docs/en",
      "julia-docs/en",
      "lua-manual/en",
      "perl-docs/en",
      "r-manuals/en",
      "zig-docs/en",
      "haxe-manual/en",
      "nim-docs/en",
      "ocaml-docs/en",
      "crystal-docs/en",
      "d-docs/en"
    ]);
    expect(
      englishGroupAJobs.every(
        (job) =>
          job.knownQueries.length > 0 &&
          job.minimumRecords > 0 &&
          job.licenseUrl.startsWith("https://")
      )
    ).toBe(true);
  });

  it("maps Bash metadata to the maintainer-published manual anchors", () => {
    const records = normalizeBashDevdocs(
      {
        entries: [
          {
            name: "Shell Parameter Expansion",
            path: "shell-parameter-expansion#index-parameter-expansion",
            type: "Manual"
          },
          {
            name: "Creating Internationalized Scripts",
            path: "creating-internationalized-scripts",
            type: "Manual"
          }
        ]
      },
      {
        "shell-parameter-expansion":
          '<h1 class="subsection" id="Shell-Parameter-Expansion-1">Shell Parameter Expansion</h1>',
        "creating-internationalized-scripts":
          '<h1 class="node">Creating Internationalized Scripts</h1>'
      },
      fixtureOptions({
        baseUrl: "https://tiswww.case.edu/php/chet/bash/bashref.html"
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "Shell Parameter Expansion",
        url: "https://tiswww.case.edu/php/chet/bash/bashref.html#index-parameter-expansion",
        section: "Manual"
      }),
      expect.objectContaining({
        title: "Creating Internationalized Scripts",
        url: "https://tiswww.case.edu/php/chet/bash/bashref.html#Creating-Internationalized-Scripts",
        section: "Manual"
      })
    ]);
  });

  it("normalizes a Documenter search index", () => {
    const records = normalizeDocumenterSearchIndex(
      'var documenterSearchIndex = {"docs":[{"location":"manual/types/#Types","page":"Types","title":"Type System"}]};',
      fixtureOptions({ baseUrl: "https://docs.example.test/en/v1/" })
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "Type System",
        url: "https://docs.example.test/en/v1/manual/types/#Types",
        section: "Types"
      })
    ]);
  });

  it("discovers and normalizes ExDoc sidebar entries", () => {
    const pageUrl = "https://docs.example.test/1.0/Kernel.html";
    expect(
      findExDocSidebarUrl(
        '<script src="dist/sidebar_items-ABC123.js"></script>',
        pageUrl,
        "https://docs.example.test/1.0/"
      )
    ).toBe("https://docs.example.test/1.0/dist/sidebar_items-ABC123.js");

    const records = normalizeExDocSidebar(
      'sidebarNodes={"modules":[{"id":"Kernel","title":"Kernel","nodeGroups":[{"name":"Functions","nodes":[{"title":"left + right","anchor":"+/2"}]}]}],"extras":[{"id":"patterns","title":"Patterns","headers":[{"id":"Matching","anchor":"matching"}]}],"tasks":[]}',
      fixtureOptions({ baseUrl: "https://docs.example.test/1.0/" })
    );

    expect(records.map(({ title, url }) => [title, url])).toEqual([
      ["Kernel", "https://docs.example.test/1.0/Kernel.html"],
      ["left + right", "https://docs.example.test/1.0/Kernel.html#+/2"],
      ["Patterns", "https://docs.example.test/1.0/patterns.html"],
      ["Matching", "https://docs.example.test/1.0/patterns.html#matching"]
    ]);
  });

  it("filters sitemap locations and derives searchable titles", () => {
    const records = normalizeSitemap(
      `<?xml version="1.0"?>
       <urlset>
         <url><loc>https://docs.example.test/docs/tour-of-ocaml</loc></url>
         <url><loc>https://docs.example.test/blog/ignored</loc></url>
       </urlset>`,
      fixtureOptions({
        urlPrefixes: ["https://docs.example.test/docs/"],
        section: "Guide"
      })
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "tour of ocaml",
        url: "https://docs.example.test/docs/tour-of-ocaml",
        section: "Guide"
      })
    ]);
    expect(titleFromUrl("https://docs.example.test/reference/error_handling.html")).toBe(
      "error handling"
    );
    expect(titleFromUrl("https://docs.example.test/reference/macros/index.html")).toBe(
      "macros"
    );
  });

  it("preserves case-sensitive Perl module routes", () => {
    const records = normalizePerlDevdocs(
      {
        entries: [
          { name: "HTTP::Tiny", path: "http::tiny", type: "Standard Modules" },
          { name: "map", path: "perlfunc#map", type: "Functions" }
        ]
      },
      fixtureOptions({ baseUrl: "https://perldoc.example.test/" })
    );

    expect(records.map(({ title, url }) => [title, url])).toEqual([
      ["HTTP::Tiny", "https://perldoc.example.test/HTTP::Tiny"],
      ["map", "https://perldoc.example.test/perlfunc#map"]
    ]);
  });

  it("restores single-segment Perl module case that DevDocs lowercases", () => {
    const records = normalizePerlDevdocs(
      {
        entries: [
          { name: "FileCache", path: "filecache", type: "Standard Modules" },
          { name: "AnyDBM_File", path: "anydbm_file", type: "Standard Modules" },
          { name: "autodie", path: "autodie", type: "Pragmas" },
          { name: "perlre", path: "perlre", type: "Reference Manual" }
        ]
      },
      fixtureOptions({ baseUrl: "https://perldoc.example.test/" })
    );

    expect(records.map(({ url }) => url)).toEqual([
      "https://perldoc.example.test/FileCache",
      "https://perldoc.example.test/AnyDBM_File",
      "https://perldoc.example.test/autodie",
      "https://perldoc.example.test/perlre"
    ]);
  });

  it("canonicalizes Groovy's removed type-checking extension page", async () => {
    const job = englishGroupAJobs.find(
      (candidate) => candidate.sourceId === "groovy-docs"
    ) as Record<string, any>;
    const records = await job.load({
      fetchText: async () =>
        '<a href="type-checking-extensions.html">type checking extensions</a>' +
        '<a href="core-semantics.html">Core semantics</a>'
    });

    expect(records).toEqual([
      {
        title: "type checking extensions",
        url: "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/core-semantics.html#_type_checking_extensions"
      },
      {
        title: "Core semantics",
        url: "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/core-semantics.html"
      }
    ]);
    expect(
      canonicalizeGroovyDocumentationUrl(
        "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/closures.html"
      )
    ).toBe(
      "https://docs.groovy-lang.org/docs/groovy-5.0.7/html/documentation/closures.html"
    );
  });

  it("replaces broken D backend links with official library-index routes", async () => {
    const job = englishGroupAJobs.find(
      (candidate) => candidate.sourceId === "d-docs"
    ) as Record<string, any>;
    const inputs: string[] = [];
    const records = await job.load({
      fetchText: async (url: string) => {
        inputs.push(url);
        if (url.includes("/spec/")) {
          return '<a href="template.html">Templates</a>';
        }
        if (url.includes("/phobos/")) {
          return (
            '<a href="std_algorithm.html">algorithm</a>' +
            '<a href="dmd_backend_debugprint.html">debugprint</a>'
          );
        }
        return '<a href="./dmd/backend/debugprint.html">debugprint</a>';
      }
    });

    expect(inputs).toEqual([
      "https://dlang.org/spec/spec.html",
      "https://dlang.org/phobos/index.html",
      "https://dlang.org/library/index.html"
    ]);
    expect(records).toEqual([
      { title: "Templates", url: "https://dlang.org/spec/template.html" },
      { title: "algorithm", url: "https://dlang.org/phobos/std_algorithm.html" },
      {
        title: "debugprint",
        url: "https://dlang.org/library/dmd/backend/debugprint.html"
      }
    ]);
  });

  it("rejects malformed structured indexes", () => {
    expect(() =>
      findExDocSidebarUrl("<html></html>", "https://docs.example.test/")
    ).toThrow(/sidebar index/);
    expect(() =>
      findExDocSidebarUrl(
        '<script src="https://evil.example/sidebar_items-ABC123.js"></script>',
        "https://hexdocs.pm/elixir/1.20.1/Kernel.html",
        "https://hexdocs.pm/elixir/1.20.1/"
      )
    ).toThrow(/outside the reviewed documentation scope/);
    expect(() =>
      normalizeDocumenterSearchIndex("not json", fixtureOptions())
    ).toThrow(/Documenter/);
    expect(() =>
      normalizeBashDevdocs({ entries: "invalid" }, {}, fixtureOptions())
    ).toThrow(/Bash DevDocs/);
    expect(() => normalizeSitemap("<html></html>", fixtureOptions())).toThrow(
      /sitemap/
    );
  });
});

function fixtureOptions(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: "example-docs",
    programmingLanguage: "example",
    sourceKind: "official",
    sourceName: "Example Documentation",
    baseUrl: "https://docs.example.test/",
    urlPrefixes: ["https://docs.example.test/"],
    ...overrides
  };
}
