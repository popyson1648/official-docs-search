import { describe, expect, it } from "vitest";
import { replacementGroupFJobs } from "../scripts/search-index/jobs/replacements-group-f.mjs";
import {
  normalizeCommonLispSitemap,
  normalizeGnuObjectiveCToc
} from "../scripts/search-index/parsers-group-f.mjs";

describe("replacement group F search-index jobs", () => {
  it("exports the two licensed replacement jobs with safety gates", () => {
    expect(replacementGroupFJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)).toEqual([
      "gnu-objc/en",
      "cl-language-reference/en"
    ]);
    for (const job of replacementGroupFJobs) {
      expect(job.minimumRecords).toBeGreaterThan(0);
      expect(job.knownQueries.length).toBeGreaterThan(0);
      expect(job.urlPrefix).toMatch(/^https:\/\//);
      expect(job.licenseUrl).toMatch(/^https:\/\//);
    }
  });

  it("extracts only the GNU Objective-C TOC subtree", () => {
    const records = normalizeGnuObjectiveCToc(
      `
        <ol>
          <li><a href="C-Extensions.html">8 C Extensions</a></li>
          <li>
            <a id="toc-GNU-Objective-C-Features" href="Objective-C.html">
              9 GNU Objective-C Features
            </a>
            <ul>
              <li><a href="Type-encoding.html">9.3 Type Encoding</a></li>
              <li><a href="https://other.example.test/outside">9.4 Outside</a></li>
            </ul>
          </li>
          <li><a href="Binary-Compatibility.html">10 Binary Compatibility</a></li>
        </ol>
      `,
      {
        urlPrefix: "https://gcc.example.test/manual/",
        section: "GNU Objective-C Features"
      }
    );

    expect(records).toEqual([
      {
        title: "GNU Objective-C Features",
        url: "https://gcc.example.test/manual/Objective-C.html",
        section: "GNU Objective-C Features"
      },
      {
        title: "Type Encoding",
        url: "https://gcc.example.test/manual/Type-encoding.html",
        section: "GNU Objective-C Features"
      }
    ]);
  });

  it("normalizes in-scope Common Lisp routes and operator groups", () => {
    const records = normalizeCommonLispSitemap(
      `
        <urlset>
          <url><loc>https://lisp.example.test/ref/chap-14/dictionary/mapc_mapcar_function</loc></url>
          <url><loc>https://lisp.example.test/ref/reference-original-index</loc></url>
          <url><loc>https://lisp.example.test/ref/category/conses</loc></url>
          <url><loc>https://lisp.example.test/ref/search</loc></url>
          <url><loc>https://other.example.test/ref/defmacro_macro</loc></url>
        </urlset>
      `,
      { urlPrefix: "https://lisp.example.test/ref/" }
    );

    expect(records).toEqual([
      {
        title: "MAPC / MAPCAR",
        url: "https://lisp.example.test/ref/chap-14/dictionary/mapc_mapcar_function",
        section: "Function"
      },
      {
        title: "Reference Original Index",
        url: "https://lisp.example.test/ref/reference-original-index"
      }
    ]);
  });

  it("rejects malformed upstream inputs", () => {
    expect(() =>
      normalizeGnuObjectiveCToc("<ol><li>Objective-C</li></ol>", {
        urlPrefix: "https://gcc.example.test/manual/"
      })
    ).toThrow(/Invalid GNU Objective-C/);
    expect(() =>
      normalizeCommonLispSitemap("<html>not a sitemap</html>", {
        urlPrefix: "https://lisp.example.test/ref/"
      })
    ).toThrow(/Invalid Common Lisp sitemap/);
  });

  it("loads only the declared static input for each job", async () => {
    const calls: string[] = [];
    const fixtures = [
      '<li><a id="toc-GNU-Objective-C-Features" href="Objective-C.html">9 GNU Objective-C Features</a></li>',
      "<urlset><url><loc>https://lisp-docs.github.io/cl-language-reference/chap-3/defmacro_macro</loc></url></urlset>"
    ];

    for (const [index, job] of replacementGroupFJobs.entries()) {
      const records = await job.load({
        fetchText: async (url: string) => {
          calls.push(url);
          return fixtures[index];
        }
      });
      expect(records).toHaveLength(1);
    }

    expect(calls).toEqual([
      "https://gcc.gnu.org/onlinedocs/gcc-15.2.0/gcc/index.html",
      "https://lisp-docs.github.io/cl-language-reference/sitemap.xml"
    ]);
  });
});
