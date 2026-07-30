import {
  getPreferredUiLanguage,
  getUiLanguage,
  type UiLanguage
} from "./i18n";

interface UiLanguagePreferences {
  requested?: string | null;
  stored?: string | null;
  acceptLanguage?: string | null;
}

export function resolveUiLanguage({
  requested,
  stored,
  acceptLanguage
}: UiLanguagePreferences): UiLanguage {
  const explicit = languagePreference(requested);
  const saved = languagePreference(stored);
  return getUiLanguage(
    explicit ?? saved ?? getPreferredUiLanguage(acceptLanguage)
  );
}

function languagePreference(value: string | null | undefined) {
  return value === "en" || value === "ja" ? value : undefined;
}
