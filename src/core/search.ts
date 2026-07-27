import type { DocumentKind, IndexSupportStatus, SourceKind } from "./sources";

export interface SearchRecord {
  title: string;
  url: string;
  programmingLanguage: string;
  docsLocale: string;
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  documentKind?: DocumentKind;
  section?: string;
  qualification?: string;
  qualificationJa?: string;
  proposalStatus?: string;
}

export interface RankedSearchRecord extends SearchRecord {
  score: number;
}

export interface SearchFacet {
  sourceId: string;
  sourceName: string;
  programmingLanguage: string;
}

export interface StoredIndexSearchResult {
  records: RankedSearchRecord[];
  facets: SearchFacet[];
}

export type StoredSearchRecord = [
  title: string,
  urlSuffix: string,
  section?: string,
  proposalStatus?: string
];

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
  documentKind?: DocumentKind;
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
  qualification?: string;
  qualificationJa?: string;
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

interface NormalizedStoredRecord {
  record: StoredSearchRecord;
  title: string;
  section: string;
  haystack: string;
  words?: string[];
}

const MINIMUM_EXACT_RESULTS_BEFORE_FUZZY = 12;
const normalizedBundleCache = new WeakMap<
  StoredSearchIndexBundle,
  NormalizedStoredRecord[]
>();

export function isSupportedSearchIndexEntry(
  entry: SearchIndexManifestEntry
): entry is SupportedSearchIndexManifestEntry {
  return entry.status === "supported" && typeof entry.path === "string";
}

export function validateStoredSearchIndex(index: StoredSearchIndex): void {
  const { bundle, entry } = index;
  if (
    !bundle ||
    bundle.schemaVersion !== 2 ||
    bundle.sourceId !== entry.sourceId ||
    bundle.docsLocale !== entry.docsLocale ||
    typeof bundle.urlPrefix !== "string" ||
    !Array.isArray(bundle.records)
  ) {
    throw new Error(`Invalid search bundle structure: ${entry.path}`);
  }
  if (bundle.records.length !== entry.recordCount) {
    throw new Error(`Search bundle count does not match its manifest entry: ${entry.path}`);
  }
  for (const record of bundle.records) {
    if (
      !Array.isArray(record) ||
      record.length < 2 ||
      record.length > 4 ||
      typeof record[0] !== "string" ||
      !record[0].trim() ||
      typeof record[1] !== "string" ||
      (record[2] !== undefined && typeof record[2] !== "string") ||
      (record[3] !== undefined && typeof record[3] !== "string")
    ) {
      throw new Error(`Invalid search record in ${entry.path}`);
    }
    safeBundleUrl(bundle.urlPrefix, record[1], entry.path);
  }
}

export function expandSearchIndexBundle(
  bundle: StoredSearchIndexBundle,
  entry: SupportedSearchIndexManifestEntry
): SearchRecord[] {
  if (bundle.sourceId !== entry.sourceId || bundle.docsLocale !== entry.docsLocale) {
    throw new Error(`Search bundle identity does not match its manifest entry: ${entry.path}`);
  }
  return bundle.records.map(([title, urlSuffix, section, proposalStatus]) => {
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
      documentKind: entry.documentKind ?? "reference",
      ...(entry.qualification ? { qualification: entry.qualification } : {}),
      ...(entry.qualificationJa ? { qualificationJa: entry.qualificationJa } : {}),
      ...(section ? { section } : {}),
      ...(proposalStatus ? { proposalStatus } : {})
    };
  });
}

export function searchRecords(records: SearchRecord[], query: string, limit = 50): RankedSearchRecord[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = unique(normalizedQuery.split(/\s+/).filter(Boolean));
  if (tokens.length === 0) return [];

  const exact = records
    .map((record) => ({
      ...record,
      score: scoreRecord(record, normalizedQuery, tokens, false)
    }))
    .filter((record) => record.score > 0)
    .sort(compareRankedRecords);
  if (exact.length >= Math.min(limit, MINIMUM_EXACT_RESULTS_BEFORE_FUZZY)) {
    return diversifyLanguages(exact, limit);
  }

  const exactUrls = new Set(exact.map((record) => record.url));
  const fuzzy = records
    .filter((record) => !exactUrls.has(record.url))
    .map((record) => ({
      ...record,
      score: scoreRecord(record, normalizedQuery, tokens, true)
    }))
    .filter((record) => record.score > 0);
  const exactResults = diversifyLanguages(exact, limit);
  return [
    ...exactResults,
    ...diversifyLanguages(
      fuzzy.sort(compareRankedRecords),
      limit - exactResults.length
    )
  ];
}

export function searchStoredIndexes(
  indexes: StoredSearchIndex[],
  query: string,
  limit = 50
): RankedSearchRecord[] {
  return searchStoredIndexesWithFacets(indexes, query, limit).records;
}

export function searchStoredIndexesWithFacets(
  indexes: StoredSearchIndex[],
  query: string,
  limit = 50
): StoredIndexSearchResult {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = unique(normalizedQuery.split(/\s+/).filter(Boolean));
  if (tokens.length === 0) return { records: [], facets: [] };

  const exactByLanguage = new Map<string, RankedSearchRecord[]>();
  const fuzzyByLanguage = new Map<string, RankedSearchRecord[]>();
  const facetsBySource = new Map<string, SearchFacet>();
  const matchedUrls = new Set<string>();
  const scan = (
    target: Map<string, RankedSearchRecord[]>,
    allowFuzzy: boolean
  ) => {
    for (const { bundle, entry } of indexes) {
      if (bundle.sourceId !== entry.sourceId || bundle.docsLocale !== entry.docsLocale) {
        throw new Error(`Search bundle identity does not match its manifest entry: ${entry.path}`);
      }
      const bucket = target.get(entry.programmingLanguage) ?? [];
      let sourceHasMatch = false;
      for (const normalizedRecord of normalizedStoredRecords(bundle)) {
        const [title, urlSuffix, section, proposalStatus] = normalizedRecord.record;
        const score = scoreText(
          title,
          section ?? "",
          entry.sourceKind,
          entry.documentKind ?? "reference",
          normalizedQuery,
          tokens,
          normalizedRecord,
          proposalStatus,
          allowFuzzy
        );
        if (score <= 0) continue;
        const url = safeBundleUrl(bundle.urlPrefix, urlSuffix, entry.path);
        sourceHasMatch = true;
        if (matchedUrls.has(url)) continue;
        matchedUrls.add(url);
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
            documentKind: entry.documentKind ?? "reference",
            ...(entry.qualification ? { qualification: entry.qualification } : {}),
            ...(entry.qualificationJa ? { qualificationJa: entry.qualificationJa } : {}),
            ...(section ? { section } : {}),
            ...(proposalStatus ? { proposalStatus } : {}),
            score
          },
          limit
        );
      }
      if (sourceHasMatch && !facetsBySource.has(entry.sourceId)) {
        facetsBySource.set(entry.sourceId, {
          sourceId: entry.sourceId,
          sourceName: entry.sourceName,
          programmingLanguage: entry.programmingLanguage
        });
      }
      target.set(entry.programmingLanguage, bucket);
    }
  };
  scan(exactByLanguage, false);
  const exactCount = [...exactByLanguage.values()].reduce(
    (total, records) => total + records.length,
    0
  );
  if (exactCount < Math.min(limit, MINIMUM_EXACT_RESULTS_BEFORE_FUZZY)) {
    scan(fuzzyByLanguage, true);
  }

  const exact = diversifyLanguages(
    [...exactByLanguage.values()].flat().sort(compareRankedRecords),
    limit
  );
  const fuzzy = diversifyLanguages(
    [...fuzzyByLanguage.values()].flat().sort(compareRankedRecords),
    limit - exact.length
  );
  return {
    records: [...exact, ...fuzzy],
    facets: [...facetsBySource.values()].sort(compareSearchFacets)
  };
}

export function scoreRecord(
  record: SearchRecord,
  normalizedQuery: string,
  tokens?: string[],
  allowFuzzy = true
): number {
  return scoreText(
    record.title,
    record.section ?? "",
    record.sourceKind,
    record.documentKind ?? "reference",
    normalizedQuery,
    tokens ?? unique(normalizedQuery.split(/\s+/).filter(Boolean)),
    undefined,
    record.proposalStatus,
    allowFuzzy
  );
}

function scoreText(
  rawTitle: string,
  rawSection: string,
  sourceKind: SourceKind,
  documentKind: DocumentKind,
  normalizedQuery: string,
  queryTokens: string[],
  normalized?: NormalizedStoredRecord,
  proposalStatus?: string,
  allowFuzzy = true
): number {
  const title = normalized?.title ?? normalizeSearchText(rawTitle);
  const section = normalized?.section ?? normalizeSearchText(rawSection);
  const haystack = normalized?.haystack ?? `${title} ${section}`.trim();
  let words = normalized?.words;
  const fuzzyDistances = queryTokens.map((token) => {
    if (haystack.includes(token)) return 0;
    if (!allowFuzzy) return undefined;
    words ??= searchableWords(haystack);
    if (normalized) normalized.words = words;
    return fuzzyTokenDistance(token, haystack, words);
  });
  if (fuzzyDistances.some((distance) => distance === undefined)) return 0;

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

  score -= fuzzyDistances.reduce<number>(
    (total, distance) => total + (distance ?? 0) * 18,
    0
  );
  if (sourceKind === "official") score += 5;
  if (documentKind === "proposal") score -= 12;
  if (proposalStatus && /withdrawn|rejected|superseded|inactive|deferred/i.test(proposalStatus)) {
    score -= 8;
  } else if (proposalStatus && /draft|candidate|submitted|stage-[01](?:\D|$)/i.test(proposalStatus)) {
    score -= 4;
  }
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

function fuzzyTokenDistance(
  token: string,
  haystack: string,
  words: string[]
): number | undefined {
  if (haystack.includes(token)) return 0;
  if (token.length < 4 || !/^[\p{L}\p{N}]+$/u.test(token)) return undefined;
  const maximum = token.length >= 8 ? 2 : 1;
  let best = maximum + 1;
  for (const word of words) {
    if (
      Math.abs(word.length - token.length) > maximum ||
      (token.length < 7 && word.length !== token.length) ||
      word.length < 4 ||
      !/^[\p{L}\p{N}]+$/u.test(word)
    ) {
      continue;
    }
    const distance = damerauLevenshteinWithin(token, word, maximum);
    if (distance < best) best = distance;
    if (best === 1) break;
  }
  return best <= maximum ? best : undefined;
}

function searchableWords(value: string): string[] {
  return unique(value.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
}

function normalizedStoredRecords(
  bundle: StoredSearchIndexBundle
): NormalizedStoredRecord[] {
  const cached = normalizedBundleCache.get(bundle);
  if (cached) return cached;
  const normalized = bundle.records.map((record) => {
    const title = normalizeSearchText(record[0]);
    const section = normalizeSearchText(record[2] ?? "");
    const haystack = `${title} ${section}`.trim();
    return {
      record,
      title,
      section,
      haystack
    };
  });
  normalizedBundleCache.set(bundle, normalized);
  return normalized;
}

function damerauLevenshteinWithin(
  left: string,
  right: string,
  maximum: number
): number {
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  const previousPrevious = new Array(right.length + 1).fill(0);
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
      let value = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitution
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        value = Math.min(value, previousPrevious[column - 2] + 1);
      }
      current[column] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > maximum) return maximum + 1;
    for (let column = 0; column <= right.length; column += 1) {
      previousPrevious[column] = previous[column];
    }
    previous = current;
  }
  return previous[right.length];
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

function compareSearchFacets(left: SearchFacet, right: SearchFacet): number {
  return (
    left.programmingLanguage.localeCompare(right.programmingLanguage) ||
    left.sourceName.localeCompare(right.sourceName) ||
    left.sourceId.localeCompare(right.sourceId)
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
