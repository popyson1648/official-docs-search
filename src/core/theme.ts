export const THEME_SETTINGS = ["dark", "light", "system"] as const;

export type ThemeSetting = (typeof THEME_SETTINGS)[number];

export const THEME_COOKIE_NAME = "ods_theme";
export const THEME_COOKIE_MAX_AGE = 31_536_000;

export function getThemeSetting(
  value: string | null | undefined
): ThemeSetting {
  return THEME_SETTINGS.includes(value as ThemeSetting)
    ? (value as ThemeSetting)
    : "system";
}

export function serializeThemeCookie(setting: ThemeSetting): string {
  return `${THEME_COOKIE_NAME}=${setting}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}
