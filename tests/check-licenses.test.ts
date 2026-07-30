import { describe, expect, it } from "vitest";
import {
  collectProductionLicenses,
  evaluateLicense,
  packageNameFromLockPath,
  reviewLicenses
} from "../scripts/check-licenses.mjs";

describe("dependency license review", () => {
  it("reads the package name from a nested lockfile path", () => {
    expect(packageNameFromLockPath("node_modules/astro")).toBe("astro");
    expect(
      packageNameFromLockPath("node_modules/miniflare/node_modules/@img/sharp-wasm32")
    ).toBe("@img/sharp-wasm32");
  });

  it("accepts permissive licenses and either side of an OR choice", () => {
    expect(evaluateLicense("MIT", "astro").ok).toBe(true);
    expect(evaluateLicense("(MIT OR Apache-2.0)", "astro").ok).toBe(true);
    expect(evaluateLicense("Apache-2.0 AND MIT", "astro").ok).toBe(true);
  });

  it("rejects strong copyleft, unknown, and missing licenses", () => {
    expect(evaluateLicense("GPL-3.0-only", "example")).toMatchObject({
      ok: false,
      problem: expect.stringContaining("strong copyleft")
    });
    expect(evaluateLicense("AGPL-3.0-or-later", "example").ok).toBe(false);
    expect(evaluateLicense("SEE LICENSE IN LICENSE", "example").ok).toBe(false);
    expect(evaluateLicense(undefined, "example")).toMatchObject({
      ok: false,
      problem: "declares no license"
    });
  });

  it("allows weak copyleft only for reviewed build-time packages", () => {
    expect(evaluateLicense("LGPL-3.0-or-later", "@img/sharp-libvips-linux-x64")).toMatchObject({
      ok: true,
      reviewed: true
    });
    expect(evaluateLicense("MPL-2.0", "lightningcss")).toMatchObject({
      ok: true,
      reviewed: true
    });
    expect(evaluateLicense("LGPL-3.0-or-later", "some-runtime-library")).toMatchObject({
      ok: false,
      problem: expect.stringContaining("unreviewed weak copyleft")
    });
  });

  it("reviews only non-development lockfile entries", () => {
    const entries = collectProductionLicenses(
      {
        packages: {
          "": { name: "root" },
          "node_modules/astro": { license: "MIT" },
          "node_modules/vitest": { dev: true, license: "GPL-3.0-only" },
          "node_modules/typescript": { devOptional: true, license: "GPL-3.0-only" },
          "node_modules/needs-manifest": {}
        }
      },
      (path: string) =>
        path === "node_modules/needs-manifest" ? "ISC" : undefined
    );

    expect(entries.map((entry) => entry.name)).toEqual([
      "astro",
      "needs-manifest"
    ]);
    expect(reviewLicenses(entries)).toEqual({ failures: [], reviewed: [] });
  });

  it("reports every unacceptable dependency by name", () => {
    const { failures } = reviewLicenses([
      { path: "node_modules/a", name: "a", license: "MIT" },
      { path: "node_modules/b", name: "b", license: "AGPL-3.0-or-later" },
      { path: "node_modules/c", name: "c", license: undefined }
    ]);

    expect(failures).toEqual([
      "b uses strong copyleft AGPL-3.0-or-later",
      "c declares no license"
    ]);
  });
});
