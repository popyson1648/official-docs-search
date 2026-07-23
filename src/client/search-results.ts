import type { RankedSearchRecord } from "../core/search";
import { getSourceKindLabel } from "../core/i18n";
import {
  runSearchRequest,
  type RequestedSearchSource,
  type SearchRuntimeRequest,
  type SearchRuntimeResult,
  type UnavailableSearchSource
} from "../core/search-runtime";

export interface SearchPageOutcome {
  state: "success" | "empty" | "error";
  count: number;
  unsupportedSources: string[];
}

export async function initializeSearchPage(
  root: Document = document,
  fetcher: typeof fetch = fetch
): Promise<SearchPageOutcome | undefined> {
  const results = root.querySelector<HTMLElement>("[data-search-results]");
  if (!results) return undefined;

  const status = results.querySelector<HTMLElement>("[data-search-status]");
  const list = results.querySelector<HTMLOListElement>("[data-result-list]");
  const coverage = results.querySelector<HTMLElement>("[data-index-coverage]");
  if (!status || !list || !coverage) return undefined;

  const query = results.dataset.query?.trim() ?? "";
  const docsLocale = results.dataset.docsLocale ?? "";
  const requestedSources = parseRequestedSources(results.dataset.sources);
  if (typeof performance !== "undefined") {
    performance.clearMarks("ods-search-start");
    performance.mark("ods-search-start");
  }
  const startedAt = typeof performance === "undefined" ? undefined : performance.now();

  setStatus(status, "loading");
  try {
    const runtimeRequest = { query, docsLocale, sources: requestedSources, limit: 60 };
    const { records: ranked, unavailableSources } = await executeSearch(runtimeRequest, root, fetcher);
    const unsupportedSources = unavailableSources.map((source) => source.name);

    renderCoverage(coverage, unavailableSources);
    list.replaceChildren(...ranked.map((record) => renderResult(root, record)));
    if (ranked.length === 0) {
      setStatus(status, "empty");
      recordDuration(results, startedAt);
      return { state: "empty", count: 0, unsupportedSources };
    }

    setStatus(status, "success", ranked.length);
    recordDuration(results, startedAt);
    return { state: "success", count: ranked.length, unsupportedSources };
  } catch {
    list.replaceChildren();
    coverage.hidden = true;
    setStatus(status, "error");
    recordDuration(results, startedAt);
    return { state: "error", count: 0, unsupportedSources: [] };
  }
}

function recordDuration(element: HTMLElement, startedAt: number | undefined): void {
  if (startedAt !== undefined && typeof performance !== "undefined") {
    element.dataset.searchDurationMs = (performance.now() - startedAt).toFixed(1);
  }
}

function renderResult(root: Document, record: RankedSearchRecord): HTMLLIElement {
  const item = root.createElement("li");
  item.className = "result-item";
  item.dataset.language = record.programmingLanguage;
  item.dataset.sourceId = record.sourceId;
  item.dataset.docsLocale = record.docsLocale;

  const meta = root.createElement("div");
  meta.className = "result-meta";
  meta.append(
    metaPart(root, record.programmingLanguage),
    metaPart(root, record.docsLocale.toUpperCase()),
    sourceKindPart(root, record.sourceKind),
    metaPart(root, record.sourceName)
  );
  if (record.section) meta.append(metaPart(root, record.section));

  const heading = root.createElement("h2");
  const link = root.createElement("a");
  link.href = record.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = record.title;
  heading.append(link);

  const url = root.createElement("span");
  url.className = "result-url";
  url.textContent = record.url;
  item.append(meta, heading, url);
  return item;
}

function metaPart(root: Document, value: string): HTMLSpanElement {
  const part = root.createElement("span");
  part.textContent = value;
  return part;
}

function sourceKindPart(root: Document, kind: string): HTMLSpanElement {
  const part = root.createElement("span");
  appendLocalizedText(root, part, getSourceKindLabel("en", kind), getSourceKindLabel("ja", kind));
  return part;
}

function renderCoverage(element: HTMLElement, unavailableSources: UnavailableSearchSource[]): void {
  if (unavailableSources.length === 0) {
    element.hidden = true;
    return;
  }
  const en = unavailableSources.map((source) => coverageMessage(element, source, "en")).join(" ");
  const ja = unavailableSources.map((source) => coverageMessage(element, source, "ja")).join(" ");
  appendLocalizedText(element.ownerDocument, element, en, ja);
  element.hidden = false;
}

function coverageMessage(
  element: HTMLElement,
  source: UnavailableSearchSource,
  language: "en" | "ja"
): string {
  const suffix = language === "en" ? "En" : "Ja";
  const key = `${source.status}${suffix}`;
  const fallbacks = {
    planned: language === "en" ? "{source}: index planned." : "{source}: 索引を準備中です。",
    blocked: language === "en" ? "{source}: index blocked." : "{source}: 索引を取得できません。",
    disabled: language === "en" ? "{source}: index disabled." : "{source}: 索引は無効です。"
  };
  const template = element.dataset[key] ?? fallbacks[source.status];
  const message = template.replace("{source}", source.name);
  return source.reason ? `${message} (${source.reason})` : message;
}

function setStatus(element: HTMLElement, state: "loading" | "success" | "empty" | "error", count = 0): void {
  const en = statusMessage(element, state, "en", count);
  const ja = statusMessage(element, state, "ja", count);
  element.dataset.state = state;
  appendLocalizedText(element.ownerDocument, element, en, ja);
}

function statusMessage(element: HTMLElement, state: string, language: "en" | "ja", count: number): string {
  const key = `${state}${language === "en" ? "En" : "Ja"}`;
  const fallback = state === "success" ? (language === "en" ? "{count} results" : "{count} 件") : state;
  return (element.dataset[key] ?? fallback).replace("{count}", String(count));
}

function appendLocalizedText(root: Document, element: HTMLElement, en: string, ja: string): void {
  const enSpan = root.createElement("span");
  enSpan.className = "lang-en";
  enSpan.textContent = en;
  const jaSpan = root.createElement("span");
  jaSpan.className = "lang-ja";
  jaSpan.textContent = ja;
  element.replaceChildren(enSpan, jaSpan);
}

function parseRequestedSources(value: string | undefined): RequestedSearchSource[] {
  if (!value) return [];
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (source): source is RequestedSearchSource =>
        typeof source === "object" &&
        source !== null &&
        typeof (source as RequestedSearchSource).id === "string" &&
        typeof (source as RequestedSearchSource).name === "string"
    )
    .map((source) => ({ id: source.id, name: source.name }));
}

async function executeSearch(
  request: SearchRuntimeRequest,
  root: Document,
  fetcher: typeof fetch
): Promise<SearchRuntimeResult> {
  if (
    typeof document !== "undefined" &&
    root === document &&
    fetcher === fetch &&
    typeof Worker !== "undefined"
  ) {
    return await searchInWorker(request);
  }
  return await runSearchRequest(request, fetcher);
}

async function searchInWorker(request: SearchRuntimeRequest): Promise<SearchRuntimeResult> {
  const worker = new Worker(new URL("./search.worker.ts", import.meta.url), {
    type: "module",
    name: "documentation-search"
  });
  const id = 1;
  try {
    return await new Promise<SearchRuntimeResult>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Search worker timed out.")), 30_000);
      worker.addEventListener(
        "message",
        (event: MessageEvent<{ id: number; result?: SearchRuntimeResult; error?: string }>) => {
          if (event.data.id !== id) return;
          window.clearTimeout(timeout);
          if (event.data.result) resolve(event.data.result);
          else reject(new Error(event.data.error ?? "Search worker failed."));
        }
      );
      worker.addEventListener("error", (event) => {
        window.clearTimeout(timeout);
        reject(event.error ?? new Error(event.message));
      });
      worker.postMessage({ id, request });
    });
  } finally {
    worker.terminate();
  }
}
