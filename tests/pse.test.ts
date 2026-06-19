import { describe, expect, it } from "vitest";
import { buildProgrammableSearchConfig, sourcePattern } from "../src/core/pse";
import type { DocsSource } from "../src/core/sources";

const source: DocsSource = {
  id: "typescript-docs",
  language: "typescript",
  kind: "official",
  name: "TypeScript Documentation",
  url: "https://www.typescriptlang.org/docs/",
  domains: ["www.typescriptlang.org"],
  pathPrefixes: ["/docs/"],
  defaultEnabled: true,
  locales: ["en"]
};

describe("programmable search", () => {
  it("builds a hidden Google query with site constraints", () => {
    const config = buildProgrammableSearchConfig("generics <T>", [source]);

    expect(config.visibleQuery).toBe("generics <T>");
    expect(config.googleQuery).toBe("generics <T> (site:www.typescriptlang.org/docs/)");
    expect(config.sites).toEqual(["site:www.typescriptlang.org/docs/"]);
  });

  it("generates normalized annotation patterns", () => {
    expect(sourcePattern(source)).toEqual(["www.typescriptlang.org/docs/*"]);
  });
});
