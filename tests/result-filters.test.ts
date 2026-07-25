import { describe, expect, it } from "vitest";
import {
  resolveResultSourceFilters,
  type ResultFilterSource
} from "../src/core/result-filters";

const sources: ResultFilterSource[] = [
  {
    id: "mdn-js",
    name: "MDN JavaScript",
    programmingLanguage: "javascript",
    programmingLanguageName: "JavaScript"
  },
  {
    id: "javascript-info",
    name: "JavaScript.info",
    programmingLanguage: "javascript",
    programmingLanguageName: "JavaScript"
  },
  {
    id: "typescript-docs",
    name: "TypeScript Documentation",
    programmingLanguage: "typescript",
    programmingLanguageName: "TypeScript"
  },
  {
    id: "rust-docs",
    name: "Rust Documentation",
    programmingLanguage: "rust",
    programmingLanguageName: "Rust"
  }
];

describe("result source filters", () => {
  it("keeps every original source when both facets are empty", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(),
      sourceIds: new Set()
    });

    expect(resolved.sources).toEqual(sources);
    expect(resolved.languageIds).toEqual(new Set());
    expect(resolved.sourceIds).toEqual(new Set());
  });

  it("ORs multiple selections within the language facet", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(["javascript", "rust"]),
      sourceIds: new Set()
    });

    expect(resolved.sources.map((source) => source.id)).toEqual([
      "mdn-js",
      "javascript-info",
      "rust-docs"
    ]);
  });

  it("ORs multiple selections within the source facet", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(),
      sourceIds: new Set(["javascript-info", "rust-docs"])
    });

    expect(resolved.sources.map((source) => source.id)).toEqual([
      "javascript-info",
      "rust-docs"
    ]);
  });

  it("ANDs language and source facets", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(["javascript", "typescript"]),
      sourceIds: new Set(["javascript-info", "rust-docs"])
    });

    expect(resolved.sources.map((source) => source.id)).toEqual([
      "javascript-info"
    ]);
  });

  it("returns no sources when known language and source selections conflict", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(["typescript"]),
      sourceIds: new Set(["rust-docs"])
    });

    expect(resolved.sources).toEqual([]);
    expect(resolved.languageIds).toEqual(new Set(["typescript"]));
    expect(resolved.sourceIds).toEqual(new Set(["rust-docs"]));
  });

  it("discards selections outside the original source set", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(["javascript", "python"]),
      sourceIds: new Set(["mdn-js", "python-docs"])
    });

    expect(resolved.sources.map((source) => source.id)).toEqual(["mdn-js"]);
    expect(resolved.languageIds).toEqual(new Set(["javascript"]));
    expect(resolved.sourceIds).toEqual(new Set(["mdn-js"]));
  });

  it("treats an entirely stale facet as empty after normalization", () => {
    const resolved = resolveResultSourceFilters(sources, {
      languageIds: new Set(["python"]),
      sourceIds: new Set(["python-docs"])
    });

    expect(resolved.sources).toEqual(sources);
    expect(resolved.languageIds).toEqual(new Set());
    expect(resolved.sourceIds).toEqual(new Set());
  });

  it("preserves source-specific fields and input order", () => {
    const qualifiedSources = sources.map((source, priority) => ({
      ...source,
      priority
    }));
    const resolved = resolveResultSourceFilters(qualifiedSources, {
      languageIds: new Set(["javascript"]),
      sourceIds: new Set()
    });

    expect(resolved.sources).toEqual([
      { ...sources[0], priority: 0 },
      { ...sources[1], priority: 1 }
    ]);
  });
});
