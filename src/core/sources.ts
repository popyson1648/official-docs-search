import { parse } from "smol-toml";
import docsSourcesToml from "../data/docs-sources.toml?raw";
import type { SourceMode } from "./query";
import { normalizeLanguageId } from "./query";

export type SourceKind = "official" | "conventional" | "community";
export type IndexSupportStatus = "supported" | "planned" | "blocked" | "disabled";

export interface DocsCatalog {
  languages: DocsLanguage[];
}

export interface DocsLanguage {
  id: string;
  name: string;
  aliases: string[];
  bareAliases: string[];
  sources: DocsSource[];
}

export interface DocsSource {
  id: string;
  language: string;
  kind: SourceKind;
  name: string;
  url: string;
  domains: string[];
  pathPrefixes: string[];
  defaultEnabled: boolean;
  siteLocales: string[];
  indexes: DocsIndexSupport[];
  qualification?: LocalizedSourceQualification;
}

export interface LocalizedSourceQualification {
  en: string;
  ja: string;
}

export interface DocsIndexSupport {
  locale: string;
  status: IndexSupportStatus;
  reason?: string;
}

export interface ResolvedSearchScope {
  languages: DocsLanguage[];
  sources: DocsSource[];
  localeNotices: LocaleNotice[];
}

export interface LocaleNotice {
  language: string;
  locale: string;
  sources: DocsSource[];
}

interface ResolveOptions {
  languages: string[];
  locale?: string;
  sourceMode: SourceMode;
  enabledSourceIds?: Set<string>;
}

let cachedCatalog: DocsCatalog | undefined;

export function loadCatalog(): DocsCatalog {
  if (!cachedCatalog) {
    cachedCatalog = parseCatalog(docsSourcesToml);
  }
  return cachedCatalog;
}

export function parseCatalog(source: string): DocsCatalog {
  const data = parse(source) as Record<string, unknown>;
  const rawLanguages = Array.isArray(data.languages) ? data.languages : [];

  return {
    languages: rawLanguages.map((raw) => normalizeLanguage(raw as Record<string, unknown>))
  };
}

export function getKnownLanguageIds(catalog: DocsCatalog): Set<string> {
  const ids = new Set<string>();
  for (const language of catalog.languages) {
    ids.add(language.id);
    for (const alias of language.aliases) ids.add(normalizeLanguageId(alias));
    for (const alias of language.bareAliases) ids.add(normalizeLanguageId(alias));
  }
  return ids;
}

export function resolveSearchScope(catalog: DocsCatalog, options: ResolveOptions): ResolvedSearchScope {
  const requestedIds = options.languages.map(normalizeLanguageId);
  const languages = requestedIds.length > 0
    ? requestedIds.map((id) => findLanguage(catalog, id)).filter((value): value is DocsLanguage => value !== undefined)
    : [];

  const selectedLanguages = languages.length > 0 ? languages : catalog.languages.slice(0, 4);
  const sourceKinds = options.sourceMode === "all"
    ? new Set<SourceKind>(["official", "conventional", "community"])
    : new Set<SourceKind>(["official"]);

  const sources = selectedLanguages.flatMap((language) =>
    language.sources.filter((source) => {
      if (!sourceKinds.has(source.kind)) return false;
      if (options.enabledSourceIds && !options.enabledSourceIds.has(source.id)) {
        return false;
      }
      return true;
    })
  );

  const localeNotices = options.locale
    ? selectedLanguages.flatMap((language) => {
        const unsupported = language.sources.filter(
          (source) => sources.includes(source) && !source.siteLocales.includes(options.locale as string)
        );
        return unsupported.length > 0
          ? [
              {
                language: language.name,
                locale: options.locale as string,
                sources: unsupported
              }
            ]
          : [];
      })
    : [];

  return {
    languages: selectedLanguages,
    sources,
    localeNotices
  };
}

export function isAllowedResultUrl(urlValue: string, sources: DocsSource[]): boolean {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return false;
  }

  return sources.some((source) => {
    if (!source.domains.includes(url.hostname)) return false;
    if (source.pathPrefixes.length === 0) return true;
    return source.pathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
  });
}

function findLanguage(catalog: DocsCatalog, id: string): DocsLanguage | undefined {
  const normalized = normalizeLanguageId(id);
  return catalog.languages.find(
    (language) =>
      language.id === normalized ||
      language.aliases.map(normalizeLanguageId).includes(normalized) ||
      language.bareAliases.map(normalizeLanguageId).includes(normalized)
  );
}

function normalizeLanguage(raw: Record<string, unknown>): DocsLanguage {
  const id = String(raw.id ?? "");
  const sources = Array.isArray(raw.sources) ? raw.sources : [];
  return {
    id,
    name: String(raw.name ?? id),
    aliases: stringArray(raw.aliases),
    bareAliases: stringArray(raw.bare_aliases),
    sources: sources.map((source) => normalizeSource(id, source as Record<string, unknown>))
  };
}

function normalizeSource(language: string, raw: Record<string, unknown>): DocsSource {
  const qualificationEn = String(raw.qualification_en ?? "").trim();
  const qualificationJa = String(raw.qualification_ja ?? "").trim();
  if (Boolean(qualificationEn) !== Boolean(qualificationJa)) {
    throw new Error(
      `Source ${String(raw.id ?? "")} must provide both qualification_en and qualification_ja.`
    );
  }
  return {
    id: String(raw.id ?? ""),
    language,
    kind: normalizeSourceKind(raw.kind),
    name: String(raw.name ?? raw.id ?? ""),
    url: String(raw.url ?? ""),
    domains: stringArray(raw.domains),
    pathPrefixes: stringArray(raw.path_prefixes),
    defaultEnabled: raw.default_enabled !== false,
    siteLocales: stringArray(raw.site_locales),
    indexes: Array.isArray(raw.indexes)
      ? raw.indexes.map((index) => normalizeIndexSupport(index as Record<string, unknown>))
      : [],
    ...(qualificationEn && qualificationJa
      ? { qualification: { en: qualificationEn, ja: qualificationJa } }
      : {})
  };
}

function normalizeIndexSupport(raw: Record<string, unknown>): DocsIndexSupport {
  const status = raw.status;
  if (status !== "supported" && status !== "planned" && status !== "blocked" && status !== "disabled") {
    throw new Error(`Invalid index support status: ${String(status)}`);
  }
  const reason = String(raw.reason ?? "").trim();
  return {
    locale: String(raw.locale ?? ""),
    status,
    ...(reason ? { reason } : {})
  };
}

function normalizeSourceKind(value: unknown): SourceKind {
  if (value === "conventional" || value === "community") return value;
  return "official";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
