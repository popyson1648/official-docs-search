import { describe, expect, it } from "vitest";
import {
  getThemeSetting,
  serializeThemeCookie,
  THEME_SETTINGS
} from "../src/core/theme";

describe("theme settings", () => {
  it("accepts the three supported settings in menu order", () => {
    expect(THEME_SETTINGS).toEqual(["dark", "light", "system"]);
    for (const setting of THEME_SETTINGS) {
      expect(getThemeSetting(setting)).toBe(setting);
    }
  });

  it("defaults missing and invalid values to the system setting", () => {
    expect(getThemeSetting(undefined)).toBe("system");
    expect(getThemeSetting(null)).toBe("system");
    expect(getThemeSetting("auto")).toBe("system");
  });

  it("serializes a long-lived site-wide cookie", () => {
    expect(serializeThemeCookie("dark")).toBe(
      "ods_theme=dark; Path=/; Max-Age=31536000; SameSite=Lax"
    );
  });
});
