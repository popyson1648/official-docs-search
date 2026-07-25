import { describe, expect, it } from "vitest";
import { gnuJobs } from "../scripts/search-index/jobs/gnu.mjs";

describe("GNU search-index jobs", () => {
  it("keeps both GCC-hosted indexes in the monthly slow group", () => {
    expect(
      gnuJobs.map((job) => ({
        key: `${job.sourceId}/${job.docsLocale}`,
        frequency: job.updateFrequency,
        hostname: new URL(job.urlPrefix).hostname
      }))
    ).toEqual([
      {
        key: "gfortran/en",
        frequency: "monthly",
        hostname: "gcc.gnu.org"
      },
      {
        key: "gnu-objc/en",
        frequency: "monthly",
        hostname: "gcc.gnu.org"
      }
    ]);
  });

  it("loads only the declared GCC inputs", async () => {
    const calls: string[] = [];
    const fixtures = [
      '<a href="Option-Summary.html">Option Summary</a>',
      '<li><a id="toc-GNU-Objective-C-Features" href="Objective-C.html">9 GNU Objective-C Features</a></li>'
    ];

    for (const [index, job] of gnuJobs.entries()) {
      const records = await job.load({
        fetchText: async (url: string) => {
          calls.push(url);
          return fixtures[index];
        }
      });
      expect(records).toHaveLength(1);
    }

    expect(calls).toEqual([
      "https://gcc.gnu.org/onlinedocs/gfortran/index.html",
      "https://gcc.gnu.org/onlinedocs/gcc-15.2.0/gcc/index.html"
    ]);
  });
});
