import { describe, expect, it } from "vitest";
import {
  affectedSearchIndexKeys,
  gnuSearchIndexKeys
} from "../scripts/search-index/change-scope.mjs";

describe("search-index live change scope", () => {
  it("selects no upstream source for UI, tests, or generated bundles", () => {
    expect(
      affectedSearchIndexKeys([
        "src/client/search-page.ts",
        "tests/e2e/search.test.mjs",
        "public/search-index/manifest.json"
      ])
    ).toEqual([]);
  });

  it("isolates GNU job changes from non-GNU source groups", () => {
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/jobs/gnu.mjs"
      ])
    ).toEqual(["gfortran/en", "gnu-objc/en"]);
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/jobs/replacements-group-f.mjs"
      ])
    ).toEqual(["cl-language-reference/en"]);
    expect(gnuSearchIndexKeys()).toEqual([
      "gfortran/en",
      "gnu-objc/en"
    ]);
  });

  it("includes GNU only when a parser shared with GNU changes", () => {
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/parsers-group-f.mjs"
      ])
    ).toEqual(["cl-language-reference/en", "gnu-objc/en"]);
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/jobs/remaining-group-d.mjs"
      ])
    ).not.toContain("gfortran/en");
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/parsers-group-d.mjs"
      ])
    ).toContain("gfortran/en");
  });

  it("isolates C/C++, standards, and proposal adapter changes", () => {
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/cppreference-parsers.mjs"
      ])
    ).toEqual([
      "cppreference-c/en",
      "cppreference-c/ja",
      "cppreference-cpp/en",
      "cppreference-cpp/ja"
    ]);
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/standards-parsers.mjs"
      ])
    ).toEqual(["wg21-papers/en"]);
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/proposal-parsers.mjs"
      ])
    ).toEqual([
      "openjdk-jeps/en",
      "python-peps/en",
      "tc39-proposals/en"
    ]);
  });

  it("selects all sources for shared runtime, transport, and catalog changes", () => {
    for (const path of [
      "scripts/generate-search-index.mjs",
      "scripts/search-index-generator.mjs",
      "scripts/search-index.mjs",
      "scripts/search-index/http-fetch.mjs",
      "scripts/search-index/job-helpers.mjs",
      "src/data/docs-sources.toml"
    ]) {
      expect(affectedSearchIndexKeys([path]), path).toBeNull();
    }
  });

  it("fails safe to all sources for an unknown indexing module", () => {
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index/jobs/new-source.mjs"
      ])
    ).toBeNull();
  });

  it("does not fetch live data for declarations or live-runner tests", () => {
    expect(
      affectedSearchIndexKeys([
        "scripts/search-index-generator.d.mts",
        "scripts/search-index.d.mts",
        "scripts/verify-live-search-index.mjs",
        "scripts/search-index/change-scope.mjs"
      ])
    ).toEqual([]);
  });
});
