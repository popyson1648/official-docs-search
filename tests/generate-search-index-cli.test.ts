import { describe, expect, it } from "vitest";
import {
  parseSearchIndexArguments,
  searchIndexJobs,
  selectSearchIndexJobKeys
} from "../scripts/generate-search-index.mjs";

describe("search-index CLI source selection", () => {
  it("keeps GNU out of weekly selection and in monthly selection", () => {
    const weekly = selectSearchIndexJobKeys(
      searchIndexJobs,
      parseSearchIndexArguments(["--check", "--frequency", "weekly"])
    );
    const monthly = selectSearchIndexJobKeys(
      searchIndexJobs,
      parseSearchIndexArguments(["--check", "--frequency", "monthly"])
    );

    expect(weekly).not.toContain("gfortran/en");
    expect(weekly).not.toContain("gnu-objc/en");
    expect(monthly).toContain("gfortran/en");
    expect(monthly).toContain("gnu-objc/en");
  });

  it("supports source IDs, source-locale keys, and exclusions", () => {
    expect(
      selectSearchIndexJobKeys(
        searchIndexJobs,
        parseSearchIndexArguments([
          "--update",
          "--source",
          "python-docs",
          "--exclude-source=python-docs/ja"
        ])
      )
    ).toEqual(["python-docs/en"]);
  });

  it("rejects invalid modes, frequencies, and source selectors", () => {
    expect(() => parseSearchIndexArguments([])).toThrow(/exactly one/);
    expect(() =>
      parseSearchIndexArguments([
        "--check",
        "--frequency",
        "daily"
      ])
    ).toThrow(/Unsupported update frequency/);
    expect(() =>
      selectSearchIndexJobKeys(
        searchIndexJobs,
        parseSearchIndexArguments([
          "--check",
          "--source",
          "missing"
        ])
      )
    ).toThrow(/Unknown source selector/);
  });
});
