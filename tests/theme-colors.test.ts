import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8"
);
const publicAssets = {
  logo: new URL("../public/logo.png", import.meta.url),
  ogp: new URL("../public/ogp.png", import.meta.url),
  favicon: new URL("../public/favicon.png", import.meta.url),
  appleTouchIcon: new URL("../public/apple-touch-icon.png", import.meta.url)
};

describe("theme colors", () => {
  it("uses the requested theme color while preserving black result text", () => {
    expect(cssVariable("accent")).toBe("#825cff");
    expect(cssVariable("on-accent")).toBe("#12002e");
    expect(cssVariable("result-text")).toBe("#1c1f23");
    expect(contrastRatio("#825cff", cssVariable("on-accent"))).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it("preserves the perceptual lightness of the previous palette levels", () => {
    const levels = [
      ["text", "#1c1f23"],
      ["text-2", "#454b53"],
      ["muted", "#646b75"],
      ["border", "#e3e6e9"],
      ["border-strong", "#bcccea"],
      ["focus", "#5b8be0"],
      ["highlight", "#f9f833"],
      ["accent-text", "#1857c4"]
    ] as const;

    for (const [variable, previous] of levels) {
      expect(
        Math.abs(oklabLightness(cssVariable(variable)) - oklabLightness(previous)),
        `${variable} changed perceptual lightness`
      ).toBeLessThan(0.003);
    }
    expect(
      Math.abs(
        oklabLightness(cssVariable("surface")) - oklabLightness("#f5f6f7")
      )
    ).toBeLessThan(0.016);
  });

  it("keeps dark text, controls, and accents at accessible contrast levels", () => {
    const dark = darkVariables();
    expect(dark).toMatchObject({
      bg: "#100d18",
      surface: "#201a32",
      text: "#f4f1ff",
      "result-text": "#f7f5ff",
      "action-accent": "#7951ef"
    });
    expect(contrastRatio(dark.text, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark["result-text"], dark.bg)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio(dark.muted, dark.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark["accent-text"], dark.bg)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio(dark["action-accent"], "#ffffff")).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio(dark.border, dark.surface)).toBeGreaterThanOrEqual(3);
  });

  it("uses right-sized PNG brand assets", () => {
    expect(pngDimensions(publicAssets.logo)).toEqual([720, 137]);
    expect(pngDimensions(publicAssets.ogp)).toEqual([1200, 675]);
    expect(pngDimensions(publicAssets.favicon)).toEqual([192, 192]);
    expect(pngDimensions(publicAssets.appleTouchIcon)).toEqual([180, 180]);
    expect(statSync(publicAssets.logo).size).toBeLessThan(25_000);
    expect(statSync(publicAssets.ogp).size).toBeLessThan(40_000);
    expect(statSync(publicAssets.favicon).size).toBeLessThan(15_000);
    expect(statSync(publicAssets.appleTouchIcon).size).toBeLessThan(15_000);
  });
});

function cssVariable(name: string): string {
  const match = stylesheet.match(
    new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i")
  );
  if (!match) throw new Error(`Missing CSS variable: ${name}`);
  return match[1].toLowerCase();
}

function darkVariables(): Record<string, string> {
  const block = stylesheet.match(
    /:root\[data-theme-setting="dark"\]\s*\{([\s\S]*?)\}/
  )?.[1];
  if (!block) throw new Error("Missing explicit dark theme block");
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [
      match[1],
      match[2].toLowerCase()
    ])
  );
}

function oklabLightness(hex: string): number {
  const [red, green, blue] = hex
    .slice(1)
    .match(/../g)!
    .map((part) => srgbToLinear(Number.parseInt(part, 16) / 255));
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue
  );
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

function srgbToLinear(value: number): number {
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hex
    .slice(1)
    .match(/../g)!
    .map((part) => srgbToLinear(Number.parseInt(part, 16) / 255));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function pngDimensions(url: URL): [number, number] {
  const bytes = readFileSync(url);
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  );
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
