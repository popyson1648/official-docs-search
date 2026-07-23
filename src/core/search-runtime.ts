import {
  isSupportedSearchIndexEntry,
  searchStoredIndexes,
  type RankedSearchRecord,
  type SearchIndexManifest,
  type SearchIndexManifestEntry,
  type StoredSearchIndexBundle
} from "./search";

export interface RequestedSearchSource {
  id: string;
  name: string;
}

export interface SearchRuntimeRequest {
  query: string;
  docsLocale: string;
  sources: RequestedSearchSource[];
  limit?: number;
}

export interface UnavailableSearchSource extends RequestedSearchSource {
  status: Exclude<SearchIndexManifestEntry["status"], "supported">;
  reason?: string;
}

export interface SearchRuntimeResult {
  records: RankedSearchRecord[];
  unavailableSources: UnavailableSearchSource[];
}

export async function runSearchRequest(
  request: SearchRuntimeRequest,
  fetcher: typeof fetch = fetch,
  bundleCache = new Map<string, Promise<StoredSearchIndexBundle>>()
): Promise<SearchRuntimeResult> {
  const manifest = await fetchJson<SearchIndexManifest>(fetcher, "/search-index/manifest.json");
  const requestedIds = new Set(request.sources.map((source) => source.id));
  const matchingEntries = manifest.entries.filter(
    (entry) =>
      requestedIds.has(entry.sourceId) &&
      (!request.docsLocale || entry.docsLocale === request.docsLocale)
  );
  const entries = matchingEntries.filter(isSupportedSearchIndexEntry);
  const supportedIds = new Set(entries.map((entry) => entry.sourceId));
  const unavailableSources = request.sources.flatMap(
    (source): UnavailableSearchSource[] => {
      if (supportedIds.has(source.id)) return [];
      const entry = matchingEntries.find((candidate) => candidate.sourceId === source.id);
      const status =
        entry?.status === "blocked" || entry?.status === "disabled" ? entry.status : "planned";
      return [{ ...source, status, ...(entry?.reason ? { reason: entry.reason } : {}) }];
    }
  );

  const indexes = await Promise.all(
    entries.map(async (entry) => {
      let pending = bundleCache.get(entry.path);
      if (!pending) {
        pending = fetchJson<StoredSearchIndexBundle>(fetcher, entry.path);
        bundleCache.set(entry.path, pending);
      }
      return { entry, bundle: await pending };
    })
  );

  return {
    records: searchStoredIndexes(indexes, request.query, request.limit ?? 60),
    unavailableSources
  };
}

async function fetchJson<T>(fetcher: typeof fetch, path: string): Promise<T> {
  const response = await fetcher(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}
