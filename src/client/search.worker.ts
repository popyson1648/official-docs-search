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

scope.addEventListener("message", (event) => {
  const { id, request } = event.data;
  void runSearchRequest(request, fetch, bundleCache, manifestCache)
    .then((result) => scope.postMessage({ id, result }))
    .catch((error: unknown) =>
      scope.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error)
      })
    );
});
