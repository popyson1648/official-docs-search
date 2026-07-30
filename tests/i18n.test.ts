import { describe, expect, it } from "vitest";
import { getPreferredUiLanguage } from "../src/core/i18n";

describe("Accept-Language UI preference", () => {
  it("recognizes English and Japanese language ranges", () => {
    expect(getPreferredUiLanguage("ja-JP,ja;q=0.9,en;q=0.8")).toBe("ja");
    expect(getPreferredUiLanguage("en-GB,en;q=0.9,ja;q=0.7")).toBe("en");
  });

  it("respects quality weights and exclusions", () => {
    expect(getPreferredUiLanguage("ja;q=0.4,en;q=0.9")).toBe("en");
    expect(getPreferredUiLanguage("ja;q=0,en;q=0.2")).toBe("en");
    expect(getPreferredUiLanguage("en;q=0,ja;q=0")).toBeUndefined();
  });

  it("leaves unsupported and absent preferences unresolved", () => {
    expect(getPreferredUiLanguage("fr-FR,fr;q=0.9,*;q=0.8")).toBeUndefined();
    expect(getPreferredUiLanguage(null)).toBeUndefined();
    expect(getPreferredUiLanguage("")).toBeUndefined();
  });
});
