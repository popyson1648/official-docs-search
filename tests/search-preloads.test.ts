import { describe, expect, it } from "vitest";
import {
  MAX_PRELOAD_BROTLI_BYTES,
  selectInitialSearchPreloads
} from "../src/core/search-preloads";

const entry = (
  sourceId: string,
  docsLocale: string,
  path: string,
  brotliBytes = 10_000
) => ({
  sourceId,
  docsLocale,
  status: "supported",
  path,
  recordCount: 1,
  brotliBytes
});

describe("selectInitialSearchPreloads", () => {
  it("selects exact locales in source order", () => {
    expect(
      selectInitialSearchPreloads(
        {
          entries: [
            entry("python", "en", "/python.en.json"),
            entry("python", "ja", "/python.ja.json"),
            entry("rust", "en", "/rust.en.json")
          ]
        },
        [{ id: "rust" }, { id: "python" }],
        "en"
      )
    ).toEqual(["/rust.en.json", "/python.en.json"]);
  });

  it("uses the runtime's Japanese-to-English fallback", () => {
    expect(
      selectInitialSearchPreloads(
        { entries: [entry("rust", "en", "/rust.en.json")] },
        [{ id: "rust" }],
        "ja"
      )
    ).toEqual(["/rust.en.json"]);
  });

  it("does not hint unavailable, unknown-size, or over-budget bundles", () => {
    expect(
      selectInitialSearchPreloads(
        {
          entries: [
            entry("large", "en", "/large.json", MAX_PRELOAD_BROTLI_BYTES + 1),
            { ...entry("unknown", "en", "/unknown.json"), brotliBytes: undefined },
            {
              ...entry("planned", "en", "/planned.json"),
              status: "planned"
            },
            entry("small", "en", "/small.json")
          ]
        },
        [
          { id: "large" },
          { id: "unknown" },
          { id: "planned" },
          { id: "small" }
        ],
        "en"
      )
    ).toEqual(["/small.json"]);
  });

  it("caps the number of hinted bundles", () => {
    expect(
      selectInitialSearchPreloads(
        {
          entries: Array.from({ length: 6 }, (_, index) =>
            entry(`source-${index}`, "en", `/bundle-${index}.json`)
          )
        },
        Array.from({ length: 6 }, (_, index) => ({ id: `source-${index}` })),
        "en"
      )
    ).toHaveLength(4);
  });
});
