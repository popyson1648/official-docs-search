import { describe, expect, it } from "vitest";
import {
  mergeNewLanguageSourceDefaults,
  preferenceCookie,
  removeLanguageFromQuery,
  resolveSourceOptionState
} from "../src/core/search-controls";

describe("search controls", () => {
  it("builds persistent UI, Docs locale, and source-mode cookies", () => {
    expect(preferenceCookie("ui", "ja")).toBe(
      "ods_ui=ja; path=/; max-age=31536000; SameSite=Lax"
    );
    expect(preferenceCookie("docsLocale", "ja-JP")).toContain("ods_docs_locale=ja-JP");
    expect(preferenceCookie("sourceMode", "all")).toContain("ods_source=all");
  });

  it("preserves checked non-official sources while their controls are disabled", () => {
    const state = resolveSourceOptionState(
      [
        { id: "official", kind: "official", checked: true },
        { id: "mdn", kind: "conventional", checked: true },
        { id: "community", kind: "community", checked: false }
      ],
      false
    );
    expect(state.preservedIds).toEqual(["mdn"]);
    expect(state.options.map(({ id, disabled }) => [id, disabled])).toEqual([
      ["official", false],
      ["mdn", true],
      ["community", true]
    ]);
  });

  it("adds defaults only for newly introduced languages", () => {
    const selected = mergeNewLanguageSourceDefaults(
      new Set(["rust-docs"]),
      new Set(["rust"]),
      [
        {
          id: "rust",
          sources: [
            { id: "rust-docs", defaultEnabled: true },
            { id: "comprehensive-rust", defaultEnabled: true }
          ]
        },
        {
          id: "typescript",
          sources: [
            { id: "typescript-docs", defaultEnabled: true },
            { id: "typescript-disabled", defaultEnabled: false }
          ]
        }
      ]
    );

    expect([...selected]).toEqual(["rust-docs", "typescript-docs"]);
  });

  it("removes canonical languages and aliases from explicit and bare queries", () => {
    expect(removeLanguageFromQuery("lang:py,rust iterator", "python")).toBe(
      "lang:rust iterator"
    );
    expect(removeLanguageFromQuery("typescript,csharp generics", "typescript")).toBe(
      "csharp generics"
    );
    expect(removeLanguageFromQuery("rust, ts ownership", "rust")).toBe(
      "ts ownership"
    );
    expect(removeLanguageFromQuery("rust, ts ownership", "typescript")).toBe(
      "rust ownership"
    );
    expect(removeLanguageFromQuery("lang:rs iterator", "rust")).toBe("iterator");
  });
});
