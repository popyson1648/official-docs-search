import { describe, expect, it } from "vitest";
import {
  mergeNewLanguageSourceDefaults,
  preferenceCookie,
  removeLanguageFromQuery,
  resolveDocumentationLocale,
  resolveSourceGroupToggleState,
  resolveSourceOptionState,
  sourcePolicyFromLegacyPreferences
} from "../src/core/search-controls";

describe("search controls", () => {
  it("builds persistent UI and source-policy cookies", () => {
    expect(preferenceCookie("ui", "ja")).toBe(
      "ods_ui=ja; path=/; max-age=31536000; SameSite=Lax"
    );
    expect(preferenceCookie("sourcePolicy", "fallback")).toContain(
      "ods_source_policy=fallback"
    );
  });

  it("uses the UI language unless the query explicitly selects a locale", () => {
    expect(resolveDocumentationLocale(undefined, "ja")).toBe("ja");
    expect(resolveDocumentationLocale("", "ja")).toBe("ja");
    expect(resolveDocumentationLocale("en", "ja")).toBe("en");
    expect(resolveDocumentationLocale("ja", "en")).toBe("ja");
  });

  it("keeps reviewed automatic fallback sources selected and interactive", () => {
    const state = resolveSourceOptionState(
      [
        {
          id: "cppreference",
          kind: "community",
          checked: true,
          automaticFallbackAllowed: true
        }
      ],
      "fallback"
    );
    expect(state.options[0]).toMatchObject({ checked: true, disabled: false });
    expect(state.preservedIds).toEqual([]);
  });

  it("unchecks unavailable non-official sources while preserving their selection", () => {
    const state = resolveSourceOptionState(
      [
        { id: "official", kind: "official", checked: true },
        { id: "mdn", kind: "conventional", checked: true },
        { id: "community", kind: "community", checked: false }
      ],
      "official"
    );
    expect(state.preservedIds).toEqual(["mdn"]);
    expect(state.options.map(({ id, checked, disabled }) => [id, checked, disabled])).toEqual([
      ["official", true, false],
      ["mdn", false, true],
      ["community", false, true]
    ]);
  });

  it("restores preserved choices when a policy allows them again", () => {
    const state = resolveSourceOptionState(
      [
        { id: "official", kind: "official", checked: true },
        { id: "mdn", kind: "conventional", checked: false }
      ],
      "all",
      new Set(["mdn"])
    );
    expect(state.options.map(({ id, checked, disabled }) => [id, checked, disabled])).toEqual([
      ["official", true, false],
      ["mdn", true, false]
    ]);
    expect(state.preservedIds).toEqual([]);
  });

  it("turns a source-group toggle on when any enabled source is selected", () => {
    expect(
      resolveSourceGroupToggleState([
        { checked: true },
        { checked: true },
        { checked: false, disabled: true }
      ])
    ).toEqual({ checked: true, disabled: false });
    expect(
      resolveSourceGroupToggleState([
        { checked: false },
        { checked: false }
      ])
    ).toEqual({ checked: false, disabled: false });
    expect(
      resolveSourceGroupToggleState([
        { checked: true },
        { checked: false }
      ])
    ).toEqual({ checked: true, disabled: false });
    expect(
      resolveSourceGroupToggleState([{ checked: true, disabled: true }])
    ).toEqual({ checked: false, disabled: true });
  });

  it("migrates the two legacy preferences into one source policy", () => {
    expect(sourcePolicyFromLegacyPreferences("all", "off")).toBe("all");
    expect(sourcePolicyFromLegacyPreferences("official", "off")).toBe("official");
    expect(sourcePolicyFromLegacyPreferences("official", "on")).toBe("fallback");
    expect(sourcePolicyFromLegacyPreferences(undefined, undefined)).toBe("fallback");
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
