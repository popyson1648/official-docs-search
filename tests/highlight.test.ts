import { describe, expect, it } from "vitest";
import { buildHighlightSpans } from "../src/core/highlight";
import { parseQuery } from "../src/core/query";
import { getKnownLanguageIds, loadCatalog } from "../src/core/sources";

const knownLanguages = getKnownLanguageIds(loadCatalog());

function highlight(value: string) {
  const { flags } = parseQuery(value, { knownLanguages });
  return buildHighlightSpans(value, flags);
}

function flagged(value: string): string[] {
  return highlight(value)
    .filter((span) => span.className === "flag-token")
    .map((span) => span.text);
}

describe("buildHighlightSpans", () => {
  it("colours a leading bare language", () => {
    expect(flagged("python list comprehension")).toEqual(["python"]);
  });

  it("colours a leading language alias", () => {
    expect(flagged("kt coroutines")).toEqual(["kt"]);
  });

  it("colours an explicit lang: flag instead of marking it invalid", () => {
    // The previous regex-based highlighter wrongly flagged a leading lang:
    // token as invalid; driving the highlight from parseQuery fixes that.
    expect(flagged("lang:python iterators")).toEqual(["lang:python"]);
  });

  it("colours flags placed after the search words", () => {
    expect(flagged("vector push_back lang:cpp locale:ja")).toEqual(["lang:cpp", "locale:ja"]);
  });

  it("marks an unsupported source value as invalid", () => {
    const invalid = highlight("source:bogus query").filter((span) =>
      span.className.includes("invalid")
    );
    expect(invalid.map((span) => span.text)).toEqual(["source:bogus"]);
  });

  it("marks a flag wedged between search words as invalid", () => {
    const invalid = highlight("quick lang:python sort").filter((span) =>
      span.className.includes("invalid")
    );
    expect(invalid.map((span) => span.text)).toEqual(["lang:python"]);
  });

  it("leaves code-like colon text as plain search words", () => {
    expect(flagged("python dict key:value")).toEqual(["python"]);
    expect(highlight("python dict key:value").some((span) => span.text === "key:value" && span.className)).toBe(false);
  });

  it("does not colour an unknown leading word", () => {
    expect(flagged("banana split")).toEqual([]);
  });

  it("preserves the original text across all spans", () => {
    const value = "lang:rust Vec::<T> collect()";
    expect(highlight(value).map((span) => span.text).join("")).toBe(value);
  });
});
