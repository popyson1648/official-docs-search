import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync("src/font-faces.css", "utf8");
const faceBlocks = [...stylesheet.matchAll(/@font-face\s*\{([^}]+)\}/gs)].map(
  (match) => match[1]
);

describe("font stylesheet", () => {
  it("preserves the product families, weights, display, and Google WOFF2 origin", () => {
    const weightsByFamily = new Map<string, Set<string>>();

    expect(faceBlocks.length).toBeGreaterThan(0);
    for (const block of faceBlocks) {
      const family = /font-family:\s*'([^']+)'\s*;/.exec(block)?.[1];
      const weight = /font-weight:\s*(\d+)\s*;/.exec(block)?.[1];
      const url = /src:\s*url\((https:[^)]+)\)\s+format\('woff2'\)\s*;/.exec(
        block
      )?.[1];
      expect(family).toBeDefined();
      expect(weight).toBeDefined();
      expect(block).toMatch(/font-display:\s*swap\s*;/);
      expect(url).toMatch(/^https:\/\/fonts\.gstatic\.com\/.*\.woff2$/);
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
  });
});
