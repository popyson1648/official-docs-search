import { normalizeLanguageId } from "./query";
import type { SourceKind } from "./sources";

import type { UiLanguage } from "./i18n";

export type Preference = "ui" | "sourcePolicy";
export type SourcePolicy = "official" | "fallback" | "all";

export interface SourceOptionState {
  id: string;
  kind: SourceKind;
  checked: boolean;
  automaticFallbackAllowed?: boolean;
}

export interface ResolvedSourceOptionState extends SourceOptionState {
  disabled: boolean;
}

export interface SourceGroupOptionState {
  checked: boolean;
  disabled?: boolean;
}

export interface SourceGroupToggleState {
  checked: boolean;
  disabled: boolean;
}

export interface SourceDefaultsLanguage {
  id: string;
  sources: Array<{
    id: string;
    defaultEnabled: boolean;
  }>;
}

const COOKIE_NAMES: Record<Preference, string> = {
  ui: "ods_ui",
  sourcePolicy: "ods_source_policy"
};

export function preferenceCookie(preference: Preference, value: string): string {
  return `${COOKIE_NAMES[preference]}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function resolveDocumentationLocale(
  queryLocale: string | undefined,
  uiLanguage: UiLanguage
): UiLanguage {
  return queryLocale === "en" || queryLocale === "ja"
    ? queryLocale
    : uiLanguage;
}

export function resolveSourceOptionState(
  options: SourceOptionState[],
  policy: SourcePolicy,
  preservedIds: ReadonlySet<string> = new Set()
): { options: ResolvedSourceOptionState[]; preservedIds: string[] } {
  const selected = (option: SourceOptionState) =>
    option.checked || preservedIds.has(option.id);
  const allowed = (option: SourceOptionState) =>
    option.kind === "official" ||
    policy === "all" ||
    (policy === "fallback" && option.automaticFallbackAllowed === true);
  return {
    options: options.map((option) => {
      const disabled = !allowed(option);
      return {
        ...option,
        checked: !disabled && selected(option),
        disabled
      };
    }),
    preservedIds: options
      .filter((option) => !allowed(option) && selected(option))
      .map((option) => option.id)
  };
}

export function resolveSourceGroupToggleState(
  options: readonly SourceGroupOptionState[]
): SourceGroupToggleState {
  const enabled = options.filter((option) => option.disabled !== true);
  const selectedCount = enabled.filter((option) => option.checked).length;
  return {
    checked: selectedCount > 0,
    disabled: enabled.length === 0
  };
}

export function sourcePolicyFromLegacyPreferences(
  sourceMode: string | undefined,
  autoNonOfficial: string | undefined
): SourcePolicy {
  if (sourceMode === "all") return "all";
  return autoNonOfficial === "off" ? "official" : "fallback";
}

export function isSourcePolicy(value: string | undefined | null): value is SourcePolicy {
  return value === "official" || value === "fallback" || value === "all";
}

export function mergeNewLanguageSourceDefaults(
  selectedIds: ReadonlySet<string>,
  previousLanguageIds: ReadonlySet<string>,
  nextLanguages: SourceDefaultsLanguage[]
): Set<string> {
  const merged = new Set(selectedIds);
  if (previousLanguageIds.size === 0) return merged;

  for (const language of nextLanguages) {
    if (previousLanguageIds.has(language.id)) continue;
    for (const source of language.sources) {
      if (source.defaultEnabled) merged.add(source.id);
    }
  }
  return merged;
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

  const spacedBareLanguages = value.match(
    /^([^\s,]+(?:,\s*[^\s,]+)+)(?=\s|$)/
  );
  if (spacedBareLanguages) {
    const remaining = spacedBareLanguages[1]
      .split(",")
      .map((language) => language.trim())
      .filter(
        (language) =>
          normalizeLanguageId(language) !== normalizeLanguageId(languageId)
      );
    if (remaining.length !== spacedBareLanguages[1].split(",").length) {
      return normalizeQueryWhitespace(
        `${remaining.join(",")}${value.slice(spacedBareLanguages[0].length)}`
      );
    }
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
