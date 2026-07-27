import type { RankedSearchRecord } from "../core/search";
import { getDocumentKindLabel, getSourceKindLabel, t } from "../core/i18n";
import {
  resolveResultSourceFilters,
  type ResultFilterSource
} from "../core/result-filters";
import {
  runSearchRequest,
  type FailedSearchSource,
  type LocaleFallbackSource,
  type RequestedSearchSource,
  type SearchRuntimeRequest,
  type SearchRuntimeResult,
  type UnavailableSearchSource
} from "../core/search-runtime";
import {
  initializeResultFilters,
  type ResultFilterControl,
  type ResultFilterState
} from "./search-result-filters";

export interface SearchPageOutcome {
  state: "success" | "empty" | "error";
  count: number;
  unsupportedSources: string[];
  fallbackSources: string[];
  failedSources: string[];
}

export interface SearchSuggestion {
  value: string;
  sourceName: string;
}

interface PendingWorkerRequest {
  resolve(result: SearchRuntimeResult): void;
  reject(error: Error): void;
  timeout: number;
}

const searchSequences = new WeakMap<Document, number>();
const resultFilterSessions = new WeakMap<Document, ResultFilterSession>();
const resultFilterControls = new WeakMap<Document, ResultFilterControl>();
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>();
let sharedSearchWorker: Worker | undefined;
let nextWorkerRequestId = 0;

interface PageRequestedSearchSource extends RequestedSearchSource, ResultFilterSource {
  programmingLanguageName?: string;
}

interface ResultFilterSession extends ResultFilterState {
  key: string;
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
  const filterMount = results.querySelector<HTMLElement>("[data-result-filters]");
  if (!status || !list || !coverage || !filterMount) return undefined;
  const sequence = nextSearchSequence(root);

  const query = results.dataset.query?.trim() ?? "";
  const docsLocale = results.dataset.docsLocale ?? "";
  const requestedSources = parseRequestedSources(results.dataset.sources);
  const filterSession = getResultFilterSession(root, query, requestedSources);
  if (requestedSources.length === 0 || results.dataset.noSources === "true") {
    resultFilterControls.get(root)?.destroy();
    resultFilterControls.delete(root);
    filterMount.replaceChildren();
    filterMount.hidden = true;
    list.replaceChildren();
    coverage.replaceChildren();
    coverage.hidden = true;
    status.dataset.emptyReason = "no-sources";
    appendLocalizedText(
      root,
      status,
      status.dataset.noSourcesEn ?? "Select at least one search source.",
      status.dataset.noSourcesJa ?? "検索対象を1つ以上選択してください。"
    );
    status.dataset.state = "empty";
    updateLoadingState(status, "empty");
    return {
      state: "empty",
      count: 0,
      unsupportedSources: [],
      fallbackSources: [],
      failedSources: []
    };
  }
  if (typeof performance !== "undefined") {
    performance.clearMarks("ods-search-start");
    performance.mark("ods-search-start");
  }
  const startedAt = typeof performance === "undefined" ? undefined : performance.now();

  setStatus(status, "loading");
  try {
    const baseResult = await executeSearch(
      searchRequest(query, docsLocale, requestedSources),
      root,
      fetcher
    );
    if (searchSequences.get(root) !== sequence) return undefined;

    const matchingSourceIds = new Set(baseResult.facets.map((facet) => facet.sourceId));
    const matchingSources = requestedSources.filter((source) => matchingSourceIds.has(source.id));
    const resolved = resolveResultSourceFilters(matchingSources, filterSession);
    filterSession.languageIds = resolved.languageIds;
    filterSession.sourceIds = resolved.sourceIds;

    let displayedResult = baseResult;
    if (hasSelectedResultFilters(filterSession)) {
      displayedResult =
        resolved.sources.length === 0
          ? emptyRuntimeResult()
          : await executeSearch(
              searchRequest(query, docsLocale, resolved.sources),
              root,
              fetcher
            );
      if (searchSequences.get(root) !== sequence) return undefined;
    }

    const outcome = renderRuntimeResult(root, status, list, coverage, displayedResult);
    resultFilterControls.get(root)?.destroy();
    let filterControl: ResultFilterControl | undefined;
    filterControl = initializeResultFilters(root, filterMount, {
      sources: requestedSources,
      facets: baseResult.facets,
      state: filterSession,
      onChange: async (selection) => {
        filterSession.languageIds = new Set(selection.languageIds);
        filterSession.sourceIds = new Set(selection.sourceIds);
        const current = resolveResultSourceFilters(matchingSources, filterSession);
        filterSession.languageIds = current.languageIds;
        filterSession.sourceIds = current.sourceIds;
        const filterSequence = nextSearchSequence(root);
        setStatus(status, "loading");
        filterControl?.setBusy(true);
        try {
          const filteredResult =
            current.sources.length === 0
              ? emptyRuntimeResult()
              : await executeSearch(
                  searchRequest(query, results.dataset.docsLocale ?? docsLocale, current.sources),
                  root,
                  fetcher
                );
          if (searchSequences.get(root) !== filterSequence) return;
          renderRuntimeResult(root, status, list, coverage, filteredResult);
          recordDuration(results, startedAt);
        } catch {
          if (searchSequences.get(root) !== filterSequence) return;
          renderSearchError(status, list, coverage);
          recordDuration(results, startedAt);
        } finally {
          if (searchSequences.get(root) === filterSequence) filterControl?.setBusy(false);
        }
      }
    });
    if (filterControl) resultFilterControls.set(root, filterControl);
    else resultFilterControls.delete(root);
    recordDuration(results, startedAt);
    return outcome;
  } catch {
    if (searchSequences.get(root) !== sequence) return undefined;
    resultFilterControls.get(root)?.destroy();
    resultFilterControls.delete(root);
    filterMount.replaceChildren();
    filterMount.hidden = true;
    renderSearchError(status, list, coverage);
    recordDuration(results, startedAt);
    return {
      state: "error",
      count: 0,
      unsupportedSources: [],
      fallbackSources: [],
      failedSources: []
    };
  }
}

function nextSearchSequence(root: Document): number {
  const sequence = (searchSequences.get(root) ?? 0) + 1;
  searchSequences.set(root, sequence);
  return sequence;
}

function getResultFilterSession(
  root: Document,
  query: string,
  sources: PageRequestedSearchSource[]
): ResultFilterSession {
  const key = `${query}\u0000${sources.map((source) => source.id).join("\u0000")}`;
  const current = resultFilterSessions.get(root);
  if (current?.key === key) return current;
  const session: ResultFilterSession = {
    key,
    languageIds: new Set(),
    sourceIds: new Set(),
    activeFacet: "language",
    open: false
  };
  resultFilterSessions.set(root, session);
  return session;
}

function searchRequest(
  query: string,
  docsLocale: string,
  sources: PageRequestedSearchSource[]
): SearchRuntimeRequest {
  return {
    query,
    docsLocale,
    sources: sources.map(({ id, name }) => ({ id, name })),
    limit: 60
  };
}

function hasSelectedResultFilters(selection: ResultFilterState): boolean {
  return selection.languageIds.size > 0 || selection.sourceIds.size > 0;
}

function emptyRuntimeResult(): SearchRuntimeResult {
  return {
    records: [],
    facets: [],
    unavailableSources: [],
    fallbackSources: [],
    failedSources: []
  };
}

function renderRuntimeResult(
  root: Document,
  status: HTMLElement,
  list: HTMLOListElement,
  coverage: HTMLElement,
  result: SearchRuntimeResult
): SearchPageOutcome {
  const unsupportedSources = result.unavailableSources.map((source) => source.name);
  const fallbackSources = result.fallbackSources.map((source) => source.name);
  const failedSources = result.failedSources.map((source) => source.name);
  renderNotices(
    coverage,
    result.unavailableSources,
    result.fallbackSources,
    result.failedSources
  );
  list.replaceChildren(...result.records.map((record) => renderResult(root, record)));
  if (result.records.length === 0) {
    setStatus(status, "empty");
    return {
      state: "empty",
      count: 0,
      unsupportedSources,
      fallbackSources,
      failedSources
    };
  }
  setStatus(status, "success", result.records.length);
  return {
    state: "success",
    count: result.records.length,
    unsupportedSources,
    fallbackSources,
    failedSources
  };
}

function renderSearchError(
  status: HTMLElement,
  list: HTMLOListElement,
  coverage: HTMLElement
): void {
  list.replaceChildren();
  coverage.hidden = true;
  setStatus(status, "error");
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

  const classification = root.createElement("div");
  classification.className = "result-classification";
  classification.append(
    textPart(root, record.programmingLanguage, "result-classification-tag"),
    textPart(root, record.docsLocale.toUpperCase(), "result-classification-tag"),
    sourceKindPart(root, record.sourceKind)
  );
  if (record.documentKind && record.documentKind !== "reference") {
    classification.append(documentKindPart(root, record.documentKind));
  }

  const attribution = root.createElement("div");
  attribution.className = "result-attribution";
  attribution.append(
    textPart(root, record.sourceName, "result-source-name"),
    textPart(root, record.url, "result-url")
  );

  const annotations = root.createElement("div");
  annotations.className = "result-annotations";
  if (record.section) {
    annotations.append(textPart(root, record.section, "result-section"));
  }
  if (record.qualification) {
    const qualification = root.createElement("span");
    qualification.className = "result-qualification";
    const japaneseQualification = record.qualificationJa ?? record.qualification;
    appendLocalizedText(
      root,
      qualification,
      `${t("en", "qualificationLabel")} ${record.qualification}`,
      `${t("ja", "qualificationLabel")}${japaneseQualification}`
    );
    annotations.append(qualification);
  }
  if (record.proposalStatus) {
    const status = root.createElement("span");
    status.className = "result-proposal-status";
    appendLocalizedText(
      root,
      status,
      `${t("en", "proposalStatus")}: ${record.proposalStatus}`,
      `${t("ja", "proposalStatus")}: ${record.proposalStatus}`
    );
    annotations.append(status);
  }
  if (
    record.documentKind === "proposal" &&
    isNonCurrentProposalStatus(record.proposalStatus)
  ) {
    const warning = root.createElement("span");
    warning.className = "result-qualification";
    appendLocalizedText(
      root,
      warning,
      t("en", "proposalWarning"),
      t("ja", "proposalWarning")
    );
    annotations.append(warning);
  }

  const heading = root.createElement("h2");
  const link = root.createElement("a");
  link.href = record.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = record.title;
  heading.append(link);

  item.append(classification, attribution, heading);
  if (annotations.childElementCount > 0) item.append(annotations);
  return item;
}

function isNonCurrentProposalStatus(status: string | undefined): boolean {
  if (!status) return true;
  return !/\b(?:accepted|active|adopted|approved|final|finished|implemented|complete)\b|closed\s*\/\s*delivered/i.test(
    status
  );
}

function textPart(root: Document, value: string, className: string): HTMLSpanElement {
  const part = root.createElement("span");
  part.className = className;
  part.textContent = value;
  return part;
}

function sourceKindPart(root: Document, kind: string): HTMLSpanElement {
  const part = root.createElement("span");
  part.className = "source-kind";
  appendLocalizedText(root, part, getSourceKindLabel("en", kind), getSourceKindLabel("ja", kind));
  return part;
}

function documentKindPart(root: Document, kind: string): HTMLSpanElement {
  const part = root.createElement("span");
  part.className = "source-kind document-kind";
  appendLocalizedText(
    root,
    part,
    getDocumentKindLabel("en", kind),
    getDocumentKindLabel("ja", kind)
  );
  return part;
}

function renderNotices(
  element: HTMLElement,
  unavailableSources: UnavailableSearchSource[],
  fallbackSources: LocaleFallbackSource[],
  failedSources: FailedSearchSource[]
): void {
  if (
    unavailableSources.length === 0 &&
    fallbackSources.length === 0 &&
    failedSources.length === 0
  ) {
    element.hidden = true;
    return;
  }
  appendLocalizedNotices(
    element.ownerDocument,
    element,
    localizedNoticeGroup(element, unavailableSources, fallbackSources, failedSources, "en"),
    localizedNoticeGroup(element, unavailableSources, fallbackSources, failedSources, "ja")
  );
  element.hidden = false;
}

interface LocalizedNoticeGroup {
  before: string[];
  fallbackSummary?: string;
  fallbackSources: string[];
  after: string[];
}

function localizedNoticeGroup(
  element: HTMLElement,
  unavailableSources: UnavailableSearchSource[],
  fallbackSources: LocaleFallbackSource[],
  failedSources: FailedSearchSource[],
  language: "en" | "ja"
): LocalizedNoticeGroup {
  const summaryKey = `localeFallbackSummary${language === "en" ? "En" : "Ja"}`;
  const fallbackSummary =
    language === "en"
      ? "The following sources do not have Japanese documentation, so English search results are shown."
      : "次のソースは日本語版がないため、英語の検索結果を表示しています。";
  return {
    before: unavailableSources.map((source) => coverageMessage(element, source, language)),
    fallbackSummary:
      fallbackSources.length > 0 ? (element.dataset[summaryKey] ?? fallbackSummary) : undefined,
    fallbackSources: fallbackSources.map((source) => source.name),
    after: failedSources.map((source) => failedSourceMessage(element, source, language))
  };
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

function failedSourceMessage(
  element: HTMLElement,
  source: FailedSearchSource,
  language: "en" | "ja"
): string {
  const key = `indexLoadFailed${language === "en" ? "En" : "Ja"}`;
  const fallback =
    language === "en"
      ? "{source} ({locale}): the index could not be loaded; other available results are shown."
      : "{source}（{locale}）: 索引を読み込めなかったため、取得できた検索結果のみ表示します。";
  return replaceNoticeTokens(element.dataset[key] ?? fallback, {
    source: source.name,
    locale: source.docsLocale.toUpperCase()
  });
}

function replaceNoticeTokens(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (match, key: string) => values[key] ?? match);
}

function setStatus(element: HTMLElement, state: "loading" | "success" | "empty" | "error", count = 0): void {
  const en = statusMessage(element, state, "en", count);
  const ja = statusMessage(element, state, "ja", count);
  element.dataset.state = state;
  if (state === "empty") element.dataset.emptyReason = "no-results";
  else delete element.dataset.emptyReason;
  updateLoadingState(element, state);
  appendLocalizedText(element.ownerDocument, element, en, ja);
}

function updateLoadingState(
  status: HTMLElement,
  state: "loading" | "success" | "empty" | "error"
): void {
  const loading = state === "loading";
  const results = status.closest<HTMLElement>("[data-search-results]");
  if (!results) return;
  results.setAttribute("aria-busy", String(loading));
  results.dataset.loading = String(loading);
  status.classList.toggle("sr-only", loading);
  const loadingView = results.querySelector<HTMLElement>("[data-result-loading]");
  if (loadingView) loadingView.hidden = !loading;
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

function appendLocalizedNotices(
  root: Document,
  element: HTMLElement,
  en: LocalizedNoticeGroup,
  ja: LocalizedNoticeGroup
): void {
  const group = (language: "en" | "ja", notices: LocalizedNoticeGroup) => {
    const container = root.createElement("div");
    container.className = `lang-${language} index-coverage-lines`;

    const appendLine = (message: string) => {
      const line = root.createElement("div");
      line.className = "index-coverage-line";
      line.textContent = message;
      container.append(line);
    };

    notices.before.forEach(appendLine);
    if (notices.fallbackSummary && notices.fallbackSources.length > 0) {
      const fallback = root.createElement("div");
      fallback.className = "index-coverage-fallback";
      const summary = root.createElement("p");
      summary.className = "index-coverage-summary";
      summary.textContent = notices.fallbackSummary;
      const sources = root.createElement("ul");
      sources.className = "index-coverage-sources";
      for (const sourceName of notices.fallbackSources) {
        const item = root.createElement("li");
        item.textContent = sourceName;
        sources.append(item);
      }
      fallback.append(summary, sources);
      container.append(fallback);
    }
    notices.after.forEach(appendLine);
    return container;
  };
  element.replaceChildren(group("en", en), group("ja", ja));
}

function parseRequestedSources(value: string | undefined): PageRequestedSearchSource[] {
  if (!value) return [];
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (source): source is PageRequestedSearchSource =>
        typeof source === "object" &&
        source !== null &&
        typeof (source as PageRequestedSearchSource).id === "string" &&
        typeof (source as PageRequestedSearchSource).name === "string" &&
        typeof (source as PageRequestedSearchSource).programmingLanguage === "string"
    )
    .map((source) => ({
      id: source.id,
      name: source.name,
      programmingLanguage: source.programmingLanguage,
      ...(typeof source.programmingLanguageName === "string"
        ? { programmingLanguageName: source.programmingLanguageName }
        : {})
    }));
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
  const worker = getSearchWorker();
  const id = ++nextWorkerRequestId;
  return await new Promise<SearchRuntimeResult>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      resetSearchWorker(new Error("Search worker timed out."));
    }, 30_000);
    pendingWorkerRequests.set(id, { resolve, reject, timeout });
    worker.postMessage({ id, request });
  });
}

export async function searchForSuggestions(
  request: SearchRuntimeRequest
): Promise<SearchSuggestion[]> {
  if (request.sources.length === 0 || request.query.trim().length < 3) return [];
  const result = await searchInWorker({ ...request, limit: 12 });
  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];
  for (const record of result.records) {
    const key = record.title.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ value: record.title, sourceName: record.sourceName });
    if (suggestions.length >= 8) break;
  }
  return suggestions;
}

function getSearchWorker(): Worker {
  if (sharedSearchWorker) return sharedSearchWorker;
  const worker = new Worker(new URL("./search.worker.ts", import.meta.url), {
    type: "module",
    name: "documentation-search"
  });
  worker.addEventListener(
    "message",
    (event: MessageEvent<{ id: number; result?: SearchRuntimeResult; error?: string }>) => {
      const pending = pendingWorkerRequests.get(event.data.id);
      if (!pending) return;
      window.clearTimeout(pending.timeout);
      pendingWorkerRequests.delete(event.data.id);
      if (event.data.result) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error ?? "Search worker failed."));
    }
  );
  worker.addEventListener("error", (event) => {
    resetSearchWorker(event.error ?? new Error(event.message));
  });
  sharedSearchWorker = worker;
  return worker;
}

function resetSearchWorker(error: Error): void {
  sharedSearchWorker?.terminate();
  sharedSearchWorker = undefined;
  for (const pending of pendingWorkerRequests.values()) {
    window.clearTimeout(pending.timeout);
    pending.reject(error);
  }
  pendingWorkerRequests.clear();
}
