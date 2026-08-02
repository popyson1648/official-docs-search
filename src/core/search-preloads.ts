import {
  selectSupportedSearchIndexEntries,
  type SelectableSearchIndexEntry
} from "./search-runtime";

export const SEARCH_RUNTIME_MANIFEST_PATH =
  "/search-index/runtime-manifest.json";
export const MAX_PRELOAD_BUNDLES = 4;
export const MAX_PRELOAD_BROTLI_BYTES = 500 * 1024;

export interface SearchPreloadEntry extends SelectableSearchIndexEntry {
  brotliBytes?: number;
}

export interface SearchPreloadManifest {
  entries: readonly SearchPreloadEntry[];
}

export interface SearchPreloadSource {
  id: string;
}

export function selectInitialSearchPreloads(
  manifest: SearchPreloadManifest,
  sources: readonly SearchPreloadSource[],
  docsLocale: string
): string[] {
  const candidatesBySource = new Map<string, SearchPreloadEntry[]>();
  for (const entry of manifest.entries) {
    const candidates = candidatesBySource.get(entry.sourceId) ?? [];
    candidates.push(entry);
    candidatesBySource.set(entry.sourceId, candidates);
  }

  const paths: string[] = [];
  const seen = new Set<string>();
  let totalBrotliBytes = 0;
  for (const source of sources) {
    const selected = selectSupportedSearchIndexEntries(
      candidatesBySource.get(source.id) ?? [],
      docsLocale
    );
    for (const entry of selected.entries) {
      const size = entry.brotliBytes;
      if (
        typeof size !== "number" ||
        size < 0 ||
        seen.has(entry.path) ||
        paths.length >= MAX_PRELOAD_BUNDLES ||
        totalBrotliBytes + size > MAX_PRELOAD_BROTLI_BYTES
      ) {
        continue;
      }
      paths.push(entry.path);
      seen.add(entry.path);
      totalBrotliBytes += size;
    }
  }
  return paths;
}
