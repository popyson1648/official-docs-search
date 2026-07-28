import { describe, expect, it } from "vitest";
import {
  getLanguageTagTextColor,
  languageColors
} from "../src/core/language-colors";

describe("language tag colors", () => {
  it("uses white on dark brand colors and black on light brand colors", () => {
    expect(getLanguageTagTextColor(languageColors.cpp)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.go)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.swift)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.html)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.typescript)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.python)).toBe("#ffffff");
    expect(getLanguageTagTextColor(languageColors.javascript)).toBe("#000000");
    expect(getLanguageTagTextColor(languageColors.bash)).toBe("#000000");
    expect(getLanguageTagTextColor(languageColors.nim)).toBe("#000000");
    expect(getLanguageTagTextColor(languageColors.webassembly)).toBe("#ffffff");
  });

  it("uses the same perceived-brightness boundary for every language", () => {
    const blackTextLanguages = new Set([
      "rust",
      "javascript",
      "kotlin",
      "bash",
      "zig",
      "nim",
      "elm",
      "sql"
    ]);
    for (const [languageId, background] of Object.entries(languageColors)) {
      expect(
        getLanguageTagTextColor(background),
        `${languageId} ${background}`
      ).toBe(blackTextLanguages.has(languageId) ? "#000000" : "#ffffff");
    }

    expect(getLanguageTagTextColor("#959595")).toBe("#ffffff");
    expect(getLanguageTagTextColor("#969696")).toBe("#000000");
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
