import {
  runSearchRequest,
  type SearchRuntimeRequest,
  type SearchRuntimeResult
} from "../core/search-runtime";
import type {
  SearchIndexManifest,
  StoredSearchIndexBundle
} from "../core/search";

interface WorkerRequest {
  id: number;
  request: SearchRuntimeRequest;
}

interface WorkerSuccess {
  id: number;
  result: SearchRuntimeResult;
}

interface WorkerFailure {
  id: number;
  error: string;
}

interface WorkerScope {
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerRequest>) => void): void;
  postMessage(message: WorkerSuccess | WorkerFailure): void;
}

const scope = globalThis as unknown as WorkerScope;
const bundleCache = new Map<string, Promise<StoredSearchIndexBundle>>();
const manifestCache = new Map<string, Promise<SearchIndexManifest>>();
const resultCache = new Map<string, Promise<SearchRuntimeResult>>();

scope.addEventListener("message", (event) => {
  const { id, request } = event.data;
  const cacheKey = JSON.stringify([
    request.query,
    request.docsLocale,
    request.limit ?? 60,
    request.sources.map((source) => source.id).sort()
  ]);
  let pending = resultCache.get(cacheKey);
  if (!pending) {
    pending = runSearchRequest(request, fetch, bundleCache, manifestCache);
    resultCache.set(cacheKey, pending);
    if (resultCache.size > 24) {
      resultCache.delete(resultCache.keys().next().value ?? "");
    }
  }
  void pending
    .then((result) => {
      if (result.failedSources.length > 0) resultCache.delete(cacheKey);
      scope.postMessage({ id, result });
    })
    .catch((error: unknown) => {
      resultCache.delete(cacheKey);
      scope.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    });
});
