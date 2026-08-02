import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheets = [
  readFileSync("src/font-faces-alexandria.css", "utf8"),
  readFileSync("src/font-faces-line-seed-jp.css", "utf8")
];
const stylesheet = stylesheets.join("\n");
const faceBlocks = [...stylesheet.matchAll(/@font-face\s*\{([^}]+)\}/gs)].map(
  (match) => match[1]
);

describe("font stylesheet", () => {
  it("keeps each generated family in its own stylesheet", () => {
    expect(stylesheets[0]).toContain("font-family: 'Alexandria'");
    expect(stylesheets[0]).not.toContain("font-family: 'LINE Seed JP'");
    expect(stylesheets[1]).toContain("font-family: 'LINE Seed JP'");
    expect(stylesheets[1]).not.toContain("font-family: 'Alexandria'");
  });

  it("preserves the product families, weights, display, and local WOFF2 files", () => {
    const weightsByFamily = new Map<string, Set<string>>();

    expect(faceBlocks.length).toBeGreaterThan(0);
    for (const block of faceBlocks) {
      const family = /font-family:\s*'([^']+)'\s*;/.exec(block)?.[1];
      const weight = /font-weight:\s*(\d+)\s*;/.exec(block)?.[1];
      const url = /src:\s*url\((\/fonts\/google\/[^)]+)\)\s+format\('woff2'\)\s*;/.exec(
        block
      )?.[1];
      expect(family).toBeDefined();
      expect(weight).toBeDefined();
      expect(block).toMatch(/font-display:\s*swap\s*;/);
      expect(url).toMatch(/^\/fonts\/google\/.*\.woff2$/);
      expect(() => readFileSync(`public${url}`)).not.toThrow();
      const weights = weightsByFamily.get(family!) ?? new Set<string>();
      weights.add(weight!);
      weightsByFamily.set(family!, weights);
    }

    expect(
      Object.fromEntries(
        [...weightsByFamily].map(([family, weights]) => [
          family,
          [...weights].sort()
        ])
      )
    ).toEqual({
      Alexandria: ["400", "500", "600", "700"],
      "LINE Seed JP": ["400", "700"]
    });
    expect(stylesheet).not.toContain("fonts.gstatic.com");
  });
});
