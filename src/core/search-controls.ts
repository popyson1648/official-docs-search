import { normalizeLanguageId } from "./query";
import type { SourceKind } from "./sources";

export type Preference = "ui" | "docsLocale" | "sourceMode";

export interface SourceOptionState {
  id: string;
  kind: SourceKind;
  checked: boolean;
}

export interface ResolvedSourceOptionState extends SourceOptionState {
  disabled: boolean;
}

const COOKIE_NAMES: Record<Preference, string> = {
  ui: "ods_ui",
  docsLocale: "ods_docs_locale",
  sourceMode: "ods_source"
};

export function preferenceCookie(preference: Preference, value: string): string {
  return `${COOKIE_NAMES[preference]}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function resolveSourceOptionState(
  options: SourceOptionState[],
  includeNonOfficial: boolean
): { options: ResolvedSourceOptionState[]; preservedIds: string[] } {
  return {
    options: options.map((option) => ({
      ...option,
      disabled: !includeNonOfficial && option.kind !== "official"
    })),
    preservedIds: includeNonOfficial
      ? []
      : options
          .filter((option) => option.kind !== "official" && option.checked)
          .map((option) => option.id)
  };
}

export function removeLanguageFromQuery(value: string, languageId: string): string {
  const languageFlag = /\blang:([^\s]+)/i;
  const match = value.match(languageFlag);
  if (match) {
    const remaining = match[1]
      .split(",")
      .filter((language) => normalizeLanguageId(language) !== normalizeLanguageId(languageId));
    return normalizeQueryWhitespace(
      remaining.length > 0
        ? value.replace(match[0], `lang:${remaining.join(",")}`)
        : value.replace(match[0], "")
    );
  }

  const tokens = value.match(/\S+|\s+/g) ?? [];
  if (tokens.length === 0) return value;
  const bareLanguages = (tokens[0] ?? "").split(",");
  const remaining = bareLanguages.filter(
    (language) => normalizeLanguageId(language) !== normalizeLanguageId(languageId)
  );
  if (remaining.length === bareLanguages.length) return value;
  if (remaining.length > 0) tokens[0] = remaining.join(",");
  else {
    tokens.shift();
    if (/^\s+$/.test(tokens[0] ?? "")) tokens.shift();
  }
  return normalizeQueryWhitespace(tokens.join(""));
}

function normalizeQueryWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
