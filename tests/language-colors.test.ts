import { describe, expect, it } from "vitest";
import {
  getLanguageTagTextColor,
  languageColors
} from "../src/core/language-colors";

describe("language tag colors", () => {
  it("chooses black for light colors and white for dark colors", () => {
    expect(getLanguageTagTextColor(languageColors.cpp)).toBe("#000000");
    expect(getLanguageTagTextColor(languageColors.javascript)).toBe("#000000");
    expect(getLanguageTagTextColor(languageColors.python)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.webassembly)).toBe("#ffffff");
  });

  it("keeps every pinned Linguist color legible with its selected text color", () => {
    for (const [languageId, background] of Object.entries(languageColors)) {
      const foreground = getLanguageTagTextColor(background);
      expect(
        contrastRatio(background, foreground),
        `${languageId} ${background} on ${foreground}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("rejects colors outside the pinned #RRGGBB format", () => {
    expect(() => getLanguageTagTextColor("#fff")).toThrow(
      "Invalid language color"
    );
    expect(() => getLanguageTagTextColor("transparent")).toThrow(
      "Invalid language color"
    );
  });
});

function contrastRatio(left: string, right: string): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(color.slice(offset, offset + 2), 16)
  );
  const [red, green, blue] = channels.map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
