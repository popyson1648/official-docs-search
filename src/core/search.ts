import type { IndexSupportStatus, SourceKind } from "./sources";

export interface SearchRecord {
  title: string;
  url: string;
  programmingLanguage: string;
  docsLocale: string;
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  section?: string;
}

export interface RankedSearchRecord extends SearchRecord {
  score: number;
}

export type StoredSearchRecord = [title: string, urlSuffix: string, section?: string];

export interface StoredSearchIndexBundle {
  schemaVersion: number;
  sourceId: string;
  docsLocale: string;
  urlPrefix: string;
  records: StoredSearchRecord[];
}

export interface SearchIndexManifestEntry {
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  programmingLanguage: string;
  docsLocale: string;
  status: IndexSupportStatus;
  reason?: string;
  path?: string;
  recordCount?: number;
  rawBytes?: number;
  gzipBytes?: number;
  brotliBytes?: number;
  outputSha256?: string;
  inputSha256?: string;
  retrievedAt?: string;
  adapter?: string;
  upstreamVersion?: string;
  attribution?: string;
  licenseUrl?: string;
  updateFrequency?: string;
  knownQueries?: string[];
}

export interface SearchIndexManifest {
  schemaVersion: number;
  generatorVersion: string;
  catalogSha256: string;
  entries: SearchIndexManifestEntry[];
}

export interface SupportedSearchIndexManifestEntry extends SearchIndexManifestEntry {
  status: "supported";
  path: string;
  recordCount: number;
}

export interface StoredSearchIndex {
  bundle: StoredSearchIndexBundle;
  entry: SupportedSearchIndexManifestEntry;
}

export function isSupportedSearchIndexEntry(
  entry: SearchIndexManifestEntry
): entry is SupportedSearchIndexManifestEntry {
  return entry.status === "supported" && typeof entry.path === "string";
}

export function expandSearchIndexBundle(
  bundle: StoredSearchIndexBundle,
  entry: SupportedSearchIndexManifestEntry
): SearchRecord[] {
  if (bundle.sourceId !== entry.sourceId || bundle.docsLocale !== entry.docsLocale) {
    throw new Error(`Search bundle identity does not match its manifest entry: ${entry.path}`);
  }
  return bundle.records.map(([title, urlSuffix, section]) => {
    const url = `${bundle.urlPrefix}${urlSuffix}`;
    const parsedUrl = new URL(url);
    if (!parsedUrl.href.startsWith(bundle.urlPrefix) || parsedUrl.protocol !== "https:") {
      throw new Error(`Unsafe search result URL in ${entry.path}`);
    }
    return {
      title,
      url,
      programmingLanguage: entry.programmingLanguage,
      docsLocale: bundle.docsLocale,
      sourceId: bundle.sourceId,
      sourceName: entry.sourceName,
      sourceKind: entry.sourceKind,
      ...(section ? { section } : {})
    };
  });
}

export function searchRecords(records: SearchRecord[], query: string, limit = 50): RankedSearchRecord[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = unique(normalizedQuery.split(/\s+/).filter(Boolean));
  if (tokens.length === 0) return [];

  const ranked = records
    .map((record) => ({ ...record, score: scoreRecord(record, normalizedQuery, tokens) }))
    .filter((record) => record.score > 0)
    .sort(compareRankedRecords);

  return diversifyLanguages(ranked, limit);
}

export function searchStoredIndexes(
  indexes: StoredSearchIndex[],
  query: string,
  limit = 50
): RankedSearchRecord[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = unique(normalizedQuery.split(/\s+/).filter(Boolean));
  if (tokens.length === 0) return [];

  const byLanguage = new Map<string, RankedSearchRecord[]>();
  for (const { bundle, entry } of indexes) {
    if (bundle.sourceId !== entry.sourceId || bundle.docsLocale !== entry.docsLocale) {
      throw new Error(`Search bundle identity does not match its manifest entry: ${entry.path}`);
    }
    const bucket = byLanguage.get(entry.programmingLanguage) ?? [];
    for (const [title, urlSuffix, section] of bundle.records) {
      const score = scoreText(title, section ?? "", entry.sourceKind, normalizedQuery, tokens);
      if (score <= 0) continue;
      const url = safeBundleUrl(bundle.urlPrefix, urlSuffix, entry.path);
      insertBounded(
        bucket,
        {
          title,
          url,
          programmingLanguage: entry.programmingLanguage,
          docsLocale: entry.docsLocale,
          sourceId: entry.sourceId,
          sourceName: entry.sourceName,
          sourceKind: entry.sourceKind,
          ...(section ? { section } : {}),
          score
        },
        limit
      );
    }
    byLanguage.set(entry.programmingLanguage, bucket);
  }

  const ranked = [...byLanguage.values()].flat().sort(compareRankedRecords);
  return diversifyLanguages(ranked, limit);
}

export function scoreRecord(record: SearchRecord, normalizedQuery: string, tokens?: string[]): number {
  return scoreText(
    record.title,
    record.section ?? "",
    record.sourceKind,
    normalizedQuery,
    tokens ?? unique(normalizedQuery.split(/\s+/).filter(Boolean))
  );
}

function scoreText(
  rawTitle: string,
  rawSection: string,
  sourceKind: SourceKind,
  normalizedQuery: string,
  queryTokens: string[]
): number {
  const title = normalizeSearchText(rawTitle);
  const section = normalizeSearchText(rawSection);
  const haystack = `${title} ${section}`.trim();
  if (!queryTokens.every((token) => haystack.includes(token))) return 0;

  let score = 40;
  if (title === normalizedQuery) score += 100;
  else if (title.startsWith(normalizedQuery)) score += 75;
  else if (title.includes(normalizedQuery)) score += 55;

  for (const token of queryTokens) {
    if (title === token) score += 30;
    else if (title.startsWith(token)) score += 20;
    else if (title.includes(token)) score += 12;
    else if (section.includes(token)) score += 4;
  }

  if (sourceKind === "official") score += 5;
  score -= Math.min(title.length / 100, 5);
  return score;
}

function insertBounded(
  records: RankedSearchRecord[],
  candidate: RankedSearchRecord,
  limit: number
): void {
  const position = records.findIndex((record) => compareRankedRecords(candidate, record) < 0);
  if (position < 0) records.push(candidate);
  else records.splice(position, 0, candidate);
  if (records.length > limit) records.length = limit;
}

function safeBundleUrl(prefix: string, suffix: string, path: string): string {
  const url = new URL(`${prefix}${suffix}`);
  if (url.protocol !== "https:" || !url.href.startsWith(prefix)) {
    throw new Error(`Unsafe search result URL in ${path}`);
  }
  return url.href;
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function diversifyLanguages(records: RankedSearchRecord[], limit: number): RankedSearchRecord[] {
  const byLanguage = new Map<string, RankedSearchRecord[]>();
  for (const record of records) {
    const bucket = byLanguage.get(record.programmingLanguage) ?? [];
    bucket.push(record);
    byLanguage.set(record.programmingLanguage, bucket);
  }

  const result: RankedSearchRecord[] = [];
  const seen = new Set<string>();
  const buckets = [...byLanguage.values()];
  for (let round = 0; round < 3 && result.length < limit; round += 1) {
    for (const bucket of buckets) {
      const record = bucket[round];
      if (record && !seen.has(record.url)) {
        result.push(record);
        seen.add(record.url);
      }
    }
  }

  for (const record of records) {
    if (result.length >= limit) break;
    if (!seen.has(record.url)) {
      result.push(record);
      seen.add(record.url);
    }
  }
  return result;
}

function compareRankedRecords(left: RankedSearchRecord, right: RankedSearchRecord): number {
  return right.score - left.score || left.title.localeCompare(right.title) || left.url.localeCompare(right.url);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
