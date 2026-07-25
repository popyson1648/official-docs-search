import {
  isSupportedSearchIndexEntry,
  searchStoredIndexesWithFacets,
  validateStoredSearchIndex,
  type RankedSearchRecord,
  type SearchFacet,
  type SearchIndexManifest,
  type SearchIndexManifestEntry,
  type StoredSearchIndex,
  type SupportedSearchIndexManifestEntry,
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

export interface LocaleFallbackSource extends RequestedSearchSource {
  requestedLocale: string;
  actualLocale: string;
}

export interface FailedSearchSource extends RequestedSearchSource {
  docsLocale: string;
  reason: string;
}

export interface SearchRuntimeResult {
  records: RankedSearchRecord[];
  facets: SearchFacet[];
  unavailableSources: UnavailableSearchSource[];
  fallbackSources: LocaleFallbackSource[];
  failedSources: FailedSearchSource[];
}

export async function runSearchRequest(
  request: SearchRuntimeRequest,
  fetcher: typeof fetch = fetch,
  bundleCache = new Map<string, Promise<StoredSearchIndexBundle>>(),
  manifestCache = new Map<string, Promise<SearchIndexManifest>>()
): Promise<SearchRuntimeResult> {
  const manifestPath = "/search-index/manifest.json";
  let pendingManifest = manifestCache.get(manifestPath);
  if (!pendingManifest) {
    pendingManifest = fetchJson<SearchIndexManifest>(fetcher, manifestPath);
    manifestCache.set(manifestPath, pendingManifest);
  }
  let manifest: SearchIndexManifest;
  try {
    manifest = await pendingManifest;
  } catch (error) {
    manifestCache.delete(manifestPath);
    throw error;
  }
  const requestedIds = new Set(request.sources.map((source) => source.id));
  const manifestEntries = manifest.entries.filter((entry) => requestedIds.has(entry.sourceId));
  const entries: SupportedSearchIndexManifestEntry[] = [];
  const fallbackSources: LocaleFallbackSource[] = [];
  const unavailableSources: UnavailableSearchSource[] = [];

  for (const source of request.sources) {
    const candidates = manifestEntries.filter((entry) => entry.sourceId === source.id);
    const selected = selectEntries(candidates, request.docsLocale);
    entries.push(...selected.entries);
    if (selected.fallbackLocale) {
      fallbackSources.push({
        ...source,
        requestedLocale: request.docsLocale,
        actualLocale: selected.fallbackLocale
      });
    }
    if (selected.entries.length === 0) {
      const entry = selectUnavailableEntry(candidates, request.docsLocale);
      const status =
        entry?.status === "blocked" || entry?.status === "disabled" ? entry.status : "planned";
      unavailableSources.push({
        ...source,
        status,
        ...(entry?.reason ? { reason: entry.reason } : {})
      });
    }
  }

  const indexes: StoredSearchIndex[] = [];
  const failedSources: FailedSearchSource[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      let pending = bundleCache.get(entry.path);
      if (!pending) {
        pending = fetchJson<StoredSearchIndexBundle>(fetcher, entry.path);
        bundleCache.set(entry.path, pending);
      }
      try {
        const bundle = await pending;
        const index = { entry, bundle };
        validateStoredSearchIndex(index);
        indexes.push(index);
      } catch (error) {
        bundleCache.delete(entry.path);
        const source = request.sources.find((candidate) => candidate.id === entry.sourceId);
        failedSources.push({
          id: entry.sourceId,
          name: source?.name ?? entry.sourceName,
          docsLocale: entry.docsLocale,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    })
  );

  const searchResult = searchStoredIndexesWithFacets(
    indexes,
    request.query,
    request.limit ?? 60
  );
  return {
    records: searchResult.records,
    facets: searchResult.facets,
    unavailableSources,
    fallbackSources,
    failedSources
  };
}

function selectEntries(
  candidates: SearchIndexManifestEntry[],
  requestedLocale: string
): {
  entries: SupportedSearchIndexManifestEntry[];
  fallbackLocale?: string;
} {
  if (!requestedLocale) return { entries: supportedEntries(candidates) };

  const exact = supportedEntries(
    candidates.filter((entry) => entry.docsLocale === requestedLocale)
  );
  if (exact.length > 0) return { entries: exact };

  if (requestedLocale === "ja") {
    const english = supportedEntries(candidates.filter((entry) => entry.docsLocale === "en"));
    if (english.length > 0) return { entries: english, fallbackLocale: "en" };
  }
  return { entries: [] };
}

function supportedEntries(
  candidates: SearchIndexManifestEntry[]
): SupportedSearchIndexManifestEntry[] {
  return candidates.filter(isSupportedSearchIndexEntry);
}

function selectUnavailableEntry(
  candidates: SearchIndexManifestEntry[],
  requestedLocale: string
): SearchIndexManifestEntry | undefined {
  const exact = requestedLocale
    ? candidates.find((entry) => entry.docsLocale === requestedLocale)
    : undefined;
  return exact ?? candidates.find((entry) => entry.status === "blocked" || entry.status === "disabled") ??
    candidates[0];
}

async function fetchJson<T>(fetcher: typeof fetch, path: string): Promise<T> {
  const response = await fetcher(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}
