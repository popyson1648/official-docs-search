import { buildHighlightSpans } from "../core/highlight";
import { t } from "../core/i18n";
import {
  getLanguageColor,
  getLanguageTagTextColor
} from "../core/language-colors";
import { parseQuery, tokenize } from "../core/query";
import {
  isSourcePolicy,
  preferenceCookie,
  removeLanguageFromQuery,
  resolveSourceGroupToggleState,
  resolveSourceOptionState,
  type SourcePolicy
} from "../core/search-controls";
import type { SourceKind } from "../core/sources";
import {
  searchForSuggestions,
  type SearchSuggestion
} from "./search-results";

export interface SearchControlCallbacks {
  onLanguageIntent?(docsLocale: string): void | Promise<void>;
  onLanguageChange?(
    docsLocale: string,
    warmup?: Promise<void>
  ): void | Promise<void>;
  onSearchSubmit?(): void | Promise<void>;
}

interface SuggestionScope {
  id: string;
  aliases: string[];
  autoNonOfficialFallback: boolean;
  sources: Array<{ id: string; name: string; kind: SourceKind }>;
}

interface ClientSearchSource {
  id: string;
  name: string;
  kind: SourceKind;
  defaultEnabled: boolean;
  selected: boolean;
}

interface ClientSearchLanguage {
  id: string;
  name: string;
  aliases: string[];
  autoNonOfficialFallback: boolean;
  sources: ClientSearchSource[];
}

export function initializeSearchControls(
  root: Document = document,
  callbacks: SearchControlCallbacks = {}
): void {
  const input = root.querySelector<HTMLInputElement>("[data-query-input]");
  const highlight = root.querySelector<HTMLElement>("[data-query-highlight]");
  const form = root.querySelector<HTMLFormElement>("[data-search-form]");
  const uiHidden = root.querySelector<HTMLInputElement>("[data-ui-hidden]");
  const sourcePolicyRadios =
    root.querySelectorAll<HTMLInputElement>("[data-source-policy-radio]");
  const sourceDetails = root.querySelector<HTMLDetailsElement>(".source-details");
  const proposalSourceToggle = root.querySelector<HTMLInputElement>(
    "[data-proposal-source-toggle]"
  );
  const uiRadios = root.querySelectorAll<HTMLInputElement>("[data-ui-radio]");
  const results = root.querySelector<HTMLElement>("[data-search-results]");
  const dialog = root.querySelector<HTMLDialogElement>("[data-help-dialog]");
  const helpOpen = root.querySelector<HTMLButtonElement>("[data-help-open]");
  const queryStack = root.querySelector<HTMLElement>("[data-query-stack]");
  const suggestions = root.querySelector<HTMLElement>("[data-search-suggestions]");
  const queryClear = root.querySelector<HTMLButtonElement>("[data-query-clear]");
  const knownLanguages = parseKnownLanguages(queryStack?.dataset.knownLanguages);
  const suggestionScopes = parseSuggestionScopes(
    queryStack?.dataset.suggestionScopes
  );
  const clientSearchCatalog = parseClientSearchCatalog(
    queryStack?.dataset.clientSearchCatalog
  );
  const selectedSourceIds = new Set(
    clientSearchCatalog.flatMap((language) =>
      language.sources.filter((source) => source.selected).map((source) => source.id)
    )
  );
  let activeScopeLanguageIds = new Set(
    [
      ...(form?.querySelectorAll<HTMLInputElement>(
        'input[name="sourceScopeLanguage"]'
      ) ?? [])
    ].map((element) => element.value)
  );
  let suggestionTimer: number | undefined;
  let suggestionSequence = 0;
  let activeSuggestion = -1;
  let composing = false;
  let renderedSuggestions: SearchSuggestion[] = [];
  const languageWarmups = new Map<string, Promise<void>>();
  const proposalSourceOptions = () => [
    ...(form?.querySelectorAll<HTMLInputElement>(
      '[data-source-option][data-document-kind="proposal"]'
    ) ?? [])
  ];
  const syncProposalSourceToggle = () => {
    if (!proposalSourceToggle) return;
    const state = resolveSourceGroupToggleState(proposalSourceOptions());
    proposalSourceToggle.checked = state.checked;
    proposalSourceToggle.disabled = state.disabled;
  };

  restoreSourceDetailsState(root, sourceDetails);
  migrateLegacyLanguageUrl(root);
  syncProposalSourceToggle();

  proposalSourceToggle?.addEventListener("change", () => {
    for (const option of proposalSourceOptions()) {
      if (!option.disabled) option.checked = proposalSourceToggle.checked;
    }
    syncProposalSourceToggle();
  });
  for (const option of proposalSourceOptions()) {
    option.addEventListener("change", syncProposalSourceToggle);
  }

  const renderHighlight = () => {
    syncQueryClearVisibility();
    if (!input || !highlight) return;
    const { flags } = parseQuery(input.value, { knownLanguages });
    highlight.replaceChildren(
      ...buildHighlightSpans(input.value, flags).map((highlightSpan) => {
        const span = root.createElement("span");
        span.textContent = highlightSpan.text;
        span.className = highlightSpan.className;
        return span;
      })
    );
  };

  input?.addEventListener("input", renderHighlight);
  input?.addEventListener("input", () => {
    if (!composing) scheduleSuggestions();
  });
  queryClear?.addEventListener("click", clearQuery);
  syncQueryClearVisibility();
  input?.addEventListener("scroll", () => {
    if (highlight) highlight.scrollLeft = input.scrollLeft;
  });
  input?.addEventListener("compositionstart", () => {
    composing = true;
    closeSuggestions();
  });
  input?.addEventListener("compositionend", () => {
    composing = false;
    renderHighlight();
    scheduleSuggestions();
  });
  input?.addEventListener("keydown", (event) => {
    if (!suggestions || suggestions.hidden || renderedSuggestions.length === 0) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeSuggestion =
        (activeSuggestion + direction + renderedSuggestions.length) %
        renderedSuggestions.length;
      updateActiveSuggestion();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
      return;
    }
    if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      applySuggestion(renderedSuggestions[activeSuggestion]);
      form?.requestSubmit();
    }
  });
  input?.addEventListener("blur", () => {
    window.setTimeout(closeSuggestions, 100);
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing) return;
    closeSuggestions();
    void submitSearchLocally();
  });

  function restoreFullSourceScope() {
    if (!form) return;
    activeScopeLanguageIds = new Set(
      clientSearchCatalog.map((language) => language.id)
    );
    syncVisibleSourceGroups(root, activeScopeLanguageIds);
    syncSourceScopeInputs(root, form, activeScopeLanguageIds);
    syncPreservedSourceInputs(root, form, clientSearchCatalog, selectedSourceIds);
  }

  function clearQuery() {
    if (!input) return;
    input.value = "";
    renderHighlight();
    closeSuggestions();
    input.focus();
  }

  function syncQueryClearVisibility() {
    if (!queryClear) return;
    queryClear.hidden = (input?.value.length ?? 0) === 0;
  }

  /* A completed search keeps the query editable on pointer-driven devices. On a
     touch device the same focus keeps the virtual keyboard over the results, so
     release it instead. An empty or invalid query never reaches this point, and
     the keyboard stays up for the correction. */
  function settleQueryFocus() {
    if (!input) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) {
      input.blur();
      return;
    }
    input.focus();
  }

  const scheduleSuggestions = () => {
    if (!input || !suggestions) return;
    if (suggestionTimer !== undefined) window.clearTimeout(suggestionTimer);
    const sequence = ++suggestionSequence;
    suggestionTimer = window.setTimeout(async () => {
      const parsed = parseQuery(input.value, { knownLanguages });
      suggestionTimer = undefined;
      if (parsed.errors.length > 0 || parsed.searchText.trim().length < 3) {
        closeSuggestions();
        return;
      }
      const requestedLanguageIds =
        parsed.languages.length > 0
          ? parsed.languages
          : suggestionScopes.slice(0, 4).map((scope) => scope.id);
      const selectedPolicy = currentSourcePolicy(sourcePolicyRadios);
      const mode =
        parsed.sourceMode ?? (selectedPolicy === "all" ? "all" : "official");
      const automaticFallback =
        parsed.sourceMode === undefined && selectedPolicy === "fallback";
      const sources = requestedLanguageIds.flatMap((languageId) => {
        const scope = suggestionScopes.find(
          (candidate) =>
            candidate.id === languageId ||
            candidate.aliases.includes(languageId)
        );
        if (!scope) return [];
        return scope.sources.filter(
          (source) =>
            mode === "all" ||
            source.kind === "official" ||
            (automaticFallback && scope.autoNonOfficialFallback)
        );
      });
      const uniqueSources = [
        ...new Map(sources.map((source) => [source.id, source])).values()
      ];
      try {
        const next = await searchForSuggestions({
          query: parsed.searchText,
          docsLocale: form?.dataset.docsLocale ?? "",
          sources: uniqueSources.map(({ id, name }) => ({ id, name })),
          limit: 8
        });
        if (sequence !== suggestionSequence || composing) return;
        renderSuggestions(next);
      } catch {
        if (sequence === suggestionSequence) closeSuggestions();
      }
    }, 160);
  };

  const renderSuggestions = (next: SearchSuggestion[]) => {
    if (!input || !suggestions) return;
    renderedSuggestions = next;
    activeSuggestion = -1;
    suggestions.replaceChildren(
      ...next.map((suggestion, index) => {
        const option = root.createElement("div");
        option.id = `search-suggestion-${index}`;
        option.className = "search-suggestion";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const value = root.createElement("span");
        value.textContent = suggestion.value;
        const source = root.createElement("small");
        source.textContent = suggestion.sourceName;
        option.append(value, source);
        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("click", () => {
          applySuggestion(suggestion);
          form?.requestSubmit();
        });
        return option;
      })
    );
    suggestions.hidden = next.length === 0;
    input.setAttribute("aria-expanded", String(next.length > 0));
    input.removeAttribute("aria-activedescendant");
  };

  const updateActiveSuggestion = () => {
    if (!input || !suggestions) return;
    suggestions
      .querySelectorAll<HTMLElement>('[role="option"]')
      .forEach((option, index) => {
        const active = index === activeSuggestion;
        option.setAttribute("aria-selected", String(active));
        option.classList.toggle("active", active);
        if (active) {
          input.setAttribute("aria-activedescendant", option.id);
          option.scrollIntoView({ block: "nearest" });
        }
      });
  };

  const applySuggestion = (suggestion: SearchSuggestion) => {
    if (!input) return;
    const parsed = parseQuery(input.value, { knownLanguages });
    const queryTokens = tokenize(input.value).filter(
      (token) =>
        !parsed.flags.some(
          (flag) => flag.start <= token.start && flag.end >= token.end
        )
    );
    const first = queryTokens[0];
    const last = queryTokens.at(-1);
    input.value =
      first && last
        ? `${input.value.slice(0, first.start)}${suggestion.value}${input.value.slice(last.end)}`
        : suggestion.value;
    renderHighlight();
    closeSuggestions();
  };

  function closeSuggestions() {
    if (!input || !suggestions) return;
    if (suggestionTimer !== undefined) {
      window.clearTimeout(suggestionTimer);
      suggestionTimer = undefined;
    }
    suggestionSequence += 1;
    renderedSuggestions = [];
    activeSuggestion = -1;
    suggestions.replaceChildren();
    suggestions.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  uiRadios.forEach((radio) => {
    const warmLanguage = () => {
      if (
        radio.checked ||
        !callbacks.onLanguageIntent ||
        !allowsIntentPrefetch(root.defaultView)
      ) {
        return;
      }
      const effectiveLocale = form?.dataset.queryLocale || radio.value;
      if (
        effectiveLocale ===
          (results?.dataset.docsLocale ?? form?.dataset.docsLocale ?? "") ||
        languageWarmups.has(effectiveLocale)
      ) {
        return;
      }
      const pending = Promise.resolve().then(() =>
        callbacks.onLanguageIntent?.(effectiveLocale)
      );
      languageWarmups.set(effectiveLocale, pending);
      void pending.catch(() => {
        if (languageWarmups.get(effectiveLocale) === pending) {
          languageWarmups.delete(effectiveLocale);
        }
      });
    };
    radio.parentElement?.addEventListener("pointerenter", warmLanguage);
    radio.addEventListener("focus", warmLanguage);
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      const previousLocale =
        results?.dataset.docsLocale ?? form?.dataset.docsLocale ?? "";
      const nextUiLanguage = radio.value === "ja" ? "ja" : "en";
      const effectiveLocale = form?.dataset.queryLocale || nextUiLanguage;
      const warmup = languageWarmups.get(effectiveLocale);
      languageWarmups.delete(effectiveLocale);
      if (form) form.dataset.docsLocale = effectiveLocale;
      if (results) results.dataset.docsLocale = effectiveLocale;
      if (results && effectiveLocale !== previousLocale) {
        void callbacks.onLanguageChange?.(effectiveLocale, warmup);
      }

      root.cookie = preferenceCookie("ui", radio.value);
      if (uiHidden) uiHidden.value = radio.value;
      root.documentElement.lang = radio.value;
      root.title = t(nextUiLanguage, "title");
      updateLanguageUrl(root, nextUiLanguage);
      root
        .querySelector<HTMLElement>("[data-back-to-top]")
        ?.setAttribute("aria-label", t(nextUiLanguage, "pageTop"));
      root
        .querySelectorAll<HTMLElement>("[data-localized-aria-label]")
        .forEach((element) => {
          const label =
            nextUiLanguage === "ja"
              ? element.dataset.labelJa
              : element.dataset.labelEn;
          if (label) element.setAttribute("aria-label", label);
        });
      uiRadios.forEach((candidate) => candidate.parentElement?.classList.remove("active"));
      radio.parentElement?.classList.add("active");
    });
  });

  sourcePolicyRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked || !isSourcePolicy(radio.value)) return;
      sourcePolicyRadios.forEach((candidate) => {
        candidate.parentElement?.classList.toggle(
          "active",
          candidate === radio
        );
      });
      const optionElements = [
        ...(form?.querySelectorAll<HTMLInputElement>("[data-source-option]") ?? [])
      ];
      const preservedIds = new Set(
        [
          ...(form?.querySelectorAll<HTMLInputElement>("[data-preserved-source]") ??
            [])
        ].map((element) => element.value)
      );
      const state = resolveSourceOptionState(
        optionElements.map((option) => ({
          id: option.value,
          kind: sourceKind(option.dataset.sourceKind),
          checked: option.checked,
          automaticFallbackAllowed:
            option.dataset.autoFallbackAllowed === "true"
        })),
        radio.value,
        preservedIds
      );
      form
        ?.querySelectorAll("[data-preserved-source]")
        .forEach((element) => element.remove());
      for (const [index, option] of optionElements.entries()) {
        option.checked = state.options[index].checked;
        option.disabled = state.options[index].disabled;
        option.closest(".source-option")?.classList.toggle(
          "disabled",
          state.options[index].disabled
        );
      }
      syncProposalSourceToggle();
      for (const sourceId of state.preservedIds) {
        const preserved = root.createElement("input");
        preserved.type = "hidden";
        preserved.name = "sourceId";
        preserved.value = sourceId;
        preserved.dataset.preservedSource = "";
        form?.append(preserved);
      }
      root.cookie = preferenceCookie("sourcePolicy", radio.value);
      preserveSourceDetailsState(root, sourceDetails);
      form?.requestSubmit();
    });
  });

  helpOpen?.addEventListener("click", () => dialog?.showModal());
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  root.querySelector("[data-active-tags]")?.addEventListener("click", (event) => {
    const target = event.target;
    const removeButton =
      target instanceof Element
        ? target.closest<HTMLButtonElement>("[data-remove-tag]")
        : undefined;
    if (!removeButton || !input) return;
    input.value = removeLanguageFromQuery(input.value, removeButton.dataset.removeTag ?? "");
    renderHighlight();
    form?.requestSubmit();
  });

  for (const option of form?.querySelectorAll<HTMLInputElement>(
    "[data-source-option]"
  ) ?? []) {
    option.addEventListener("change", () => {
      if (option.checked) selectedSourceIds.add(option.value);
      else selectedSourceIds.delete(option.value);
    });
  }

  renderHighlight();

  async function submitSearchLocally() {
    if (!form || !input) return;
    syncSelectedSourceIds(form, selectedSourceIds);
    const parsed = parseQuery(input.value, { knownLanguages });
    const errors = root.querySelector<HTMLElement>("[data-query-errors]");
    const resultsSection = root.querySelector<HTMLElement>("section.results");
    const resultsElement =
      root.querySelector<HTMLElement>("[data-search-results]");
    const hasQuery = input.value.trim().length > 0;

    renderQueryErrors(root, errors, parsed.errors.map((error) => error.message));
    renderActiveLanguageTags(root, clientSearchCatalog, parsed.languages);
    if (!hasQuery || parsed.errors.length > 0 || !resultsElement) {
      /* An empty query is the same state a fresh page load renders, where every
         language's sources are offered. Without this the Sources list keeps the
         previous query's languages. */
      if (!hasQuery) restoreFullSourceScope();
      if (resultsSection) resultsSection.hidden = true;
      if (resultsElement) {
        resultsElement.dataset.query = "";
        await callbacks.onSearchSubmit?.();
      }
      updateSearchUrl(root, form);
      signalClientPageLoad(root);
      return;
    }

    const requestedLanguages = resolveClientLanguages(
      clientSearchCatalog,
      parsed.languages
    );
    const nextScopeLanguageIds =
      parsed.languages.length > 0
        ? new Set(requestedLanguages.map((language) => language.id))
        : new Set(clientSearchCatalog.map((language) => language.id));
    for (const language of requestedLanguages) {
      if (activeScopeLanguageIds.has(language.id)) continue;
      for (const source of language.sources) {
        if (source.defaultEnabled) selectedSourceIds.add(source.id);
      }
    }
    activeScopeLanguageIds = nextScopeLanguageIds;
    syncVisibleSourceGroups(root, activeScopeLanguageIds);
    syncSourceScopeInputs(root, form, activeScopeLanguageIds);
    syncPreservedSourceInputs(root, form, clientSearchCatalog, selectedSourceIds);

    const selectedPolicy = currentSourcePolicy(sourcePolicyRadios);
    const sourceMode =
      parsed.sourceMode ?? (selectedPolicy === "all" ? "all" : "official");
    const automaticFallback =
      parsed.sourceMode === undefined && selectedPolicy === "fallback";
    const requestedSources = requestedLanguages.flatMap((language) => {
      const includeNonOfficial =
        sourceMode === "all" ||
        (automaticFallback && language.autoNonOfficialFallback);
      return language.sources
        .filter(
          (source) =>
            selectedSourceIds.has(source.id) &&
            (source.kind === "official" || includeNonOfficial)
        )
        .map((source) => ({
          id: source.id,
          name: source.name,
          programmingLanguage: language.id,
          programmingLanguageName: language.name,
          programmingLanguageColor: getLanguageColor(language.id)
        }));
    });
    const docsLocale =
      parsed.locale ?? (root.documentElement.lang === "ja" ? "ja" : "en");
    form.dataset.queryLocale = parsed.locale ?? "";
    resultsElement.dataset.query = parsed.searchText;
    resultsElement.dataset.docsLocale = docsLocale;
    resultsElement.dataset.noSources = String(requestedSources.length === 0);
    resultsElement.dataset.sources = JSON.stringify(requestedSources);
    if (form) form.dataset.docsLocale = docsLocale;
    if (resultsSection) resultsSection.hidden = false;
    updateSearchUrl(root, form);
    root.defaultView?.scrollTo({ top: 0, left: 0 });
    settleQueryFocus();
    await callbacks.onSearchSubmit?.();
    signalClientPageLoad(root);
  }
}

function parseKnownLanguages(value: string | undefined): Set<string> {
  if (!value) return new Set();
  try {
    const parsed = JSON.parse(value) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function parseSuggestionScopes(value: string | undefined): SuggestionScope[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as SuggestionScope[]) : [];
  } catch {
    return [];
  }
}

function parseClientSearchCatalog(
  value: string | undefined
): ClientSearchLanguage[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as ClientSearchLanguage[]) : [];
  } catch {
    return [];
  }
}

function resolveClientLanguages(
  catalog: ClientSearchLanguage[],
  requestedIds: string[]
): ClientSearchLanguage[] {
  if (requestedIds.length === 0) return catalog.slice(0, 4);
  return requestedIds.flatMap((requestedId) => {
    const language = catalog.find(
      (candidate) =>
        candidate.id === requestedId || candidate.aliases.includes(requestedId)
    );
    return language ? [language] : [];
  });
}

function syncSelectedSourceIds(
  form: HTMLFormElement,
  selectedSourceIds: Set<string>
): void {
  for (const option of form.querySelectorAll<HTMLInputElement>(
    "[data-source-option]"
  )) {
    if (option.checked) selectedSourceIds.add(option.value);
    else if (!option.disabled) selectedSourceIds.delete(option.value);
  }
  for (const preserved of form.querySelectorAll<HTMLInputElement>(
    "[data-preserved-source]"
  )) {
    selectedSourceIds.add(preserved.value);
  }
}

function syncSourceScopeInputs(
  root: Document,
  form: HTMLFormElement,
  languageIds: Set<string>
): void {
  form
    .querySelectorAll('input[name="sourceScopeLanguage"]')
    .forEach((element) => element.remove());
  for (const languageId of languageIds) {
    const input = root.createElement("input");
    input.type = "hidden";
    input.name = "sourceScopeLanguage";
    input.value = languageId;
    form.append(input);
  }
}

function syncVisibleSourceGroups(
  root: Document,
  languageIds: Set<string>
): void {
  const container = root.querySelector<HTMLElement>(".source-lists");
  const groups = [
    ...root.querySelectorAll<HTMLElement>("[data-source-language-group]")
  ];
  for (const group of groups) {
    group.hidden = !languageIds.has(group.dataset.sourceLanguageGroup ?? "");
  }
  if (!container) return;
  const byLanguage = new Map(
    groups.map((group) => [group.dataset.sourceLanguageGroup ?? "", group])
  );
  for (const languageId of languageIds) {
    const group = byLanguage.get(languageId);
    if (group) container.append(group);
  }
  for (const group of groups) {
    if (group.hidden) container.append(group);
  }
}

function syncPreservedSourceInputs(
  root: Document,
  form: HTMLFormElement,
  catalog: ClientSearchLanguage[],
  selectedSourceIds: Set<string>
): void {
  form
    .querySelectorAll("[data-preserved-source]")
    .forEach((element) => element.remove());
  const visibleCheckedIds = new Set(
    [...form.querySelectorAll<HTMLInputElement>("[data-source-option]")]
      .filter((option) => option.checked && !option.disabled)
      .map((option) => option.value)
  );
  const knownIds = new Set(
    catalog.flatMap((language) => language.sources.map((source) => source.id))
  );
  for (const sourceId of selectedSourceIds) {
    if (!knownIds.has(sourceId) || visibleCheckedIds.has(sourceId)) continue;
    const input = root.createElement("input");
    input.type = "hidden";
    input.name = "sourceId";
    input.value = sourceId;
    input.dataset.preservedSource = "";
    form.append(input);
  }
}

function renderQueryErrors(
  root: Document,
  mount: HTMLElement | null,
  messages: string[]
): void {
  if (!mount) return;
  mount.replaceChildren(
    ...messages.map((message) => {
      const paragraph = root.createElement("p");
      paragraph.textContent = message;
      return paragraph;
    })
  );
  mount.hidden = messages.length === 0;
}

function renderActiveLanguageTags(
  root: Document,
  catalog: ClientSearchLanguage[],
  languageIds: string[]
): void {
  const mount = root.querySelector<HTMLElement>("[data-active-tags]");
  if (!mount) return;
  mount.replaceChildren(
    ...languageIds.map((languageId) => {
      const language =
        catalog.find((candidate) => candidate.id === languageId) ??
        ({ id: languageId, name: languageId } as ClientSearchLanguage);
      const pill = root.createElement("span");
      pill.className = "fpill language-fpill";
      const color = getLanguageColor(language.id);
      if (color) {
        pill.style.setProperty("--language-color", color);
        pill.style.setProperty(
          "--language-text-color",
          getLanguageTagTextColor(color)
        );
      }
      const label = root.createElement("span");
      label.className = "fpill-label";
      label.textContent = language.name;
      const button = root.createElement("button");
      button.type = "button";
      button.className = "fpill-x";
      button.dataset.removeTag = language.id;
      const mark = root.createElement("span");
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "×";
      const accessible = root.createElement("span");
      accessible.className = "sr-only";
      const english = root.createElement("span");
      english.className = "lang-en";
      english.textContent = t("en", "removeLanguage").replace(
        "{language}",
        language.name
      );
      const japanese = root.createElement("span");
      japanese.className = "lang-ja";
      japanese.textContent = t("ja", "removeLanguage").replace(
        "{language}",
        language.name
      );
      accessible.append(english, japanese);
      button.append(mark, accessible);
      pill.append(label, button);
      return pill;
    })
  );
  mount.hidden = languageIds.length === 0;
}

function updateSearchUrl(root: Document, form: HTMLFormElement): void {
  const view = root.defaultView;
  if (!view) return;
  const url = new URL(form.action, view.location.href);
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string" && value !== "") params.append(name, value);
  }
  url.search = params.toString();
  view.history.pushState(view.history.state, "", url);
  const hasNonLocaleParameters = [...params.keys()].some((key) => key !== "ui");
  root
    .querySelector<HTMLMetaElement>('meta[name="robots"]')
    ?.setAttribute(
      "content",
      hasNonLocaleParameters
        ? "noindex,follow"
        : "index,follow,max-image-preview:large"
    );
}

function signalClientPageLoad(root: Document): void {
  root.dispatchEvent(new Event("astro:page-load"));
}

function sourceKind(value: string | undefined): SourceKind {
  if (value === "conventional" || value === "community") return value;
  return "official";
}

function currentSourcePolicy(
  radios: NodeListOf<HTMLInputElement>
): SourcePolicy {
  const selected = [...radios].find((radio) => radio.checked)?.value;
  return isSourcePolicy(selected) ? selected : "fallback";
}

const SOURCE_DETAILS_STATE_KEY = "ods_source_details_open";

function preserveSourceDetailsState(
  root: Document,
  details: HTMLDetailsElement | null
): void {
  if (!details) return;
  try {
    root.defaultView?.sessionStorage.setItem(
      SOURCE_DETAILS_STATE_KEY,
      String(details.open)
    );
  } catch {
    // Search still works when storage is unavailable.
  }
}

function restoreSourceDetailsState(
  root: Document,
  details: HTMLDetailsElement | null
): void {
  if (!details) return;
  try {
    const storage = root.defaultView?.sessionStorage;
    const stored = storage?.getItem(SOURCE_DETAILS_STATE_KEY);
    storage?.removeItem(SOURCE_DETAILS_STATE_KEY);
    if (stored !== null && stored !== undefined) {
      details.open = stored === "true";
    }
  } catch {
    // The server-rendered closed state remains usable without storage.
  }
}

function updateLanguageUrl(root: Document, uiLanguage: string): void {
  const view = root.defaultView;
  if (!view) return;
  const url = new URL(view.location.href);
  url.searchParams.set("ui", uiLanguage);
  url.searchParams.delete("docsLocale");
  view.history.replaceState(view.history.state, "", url);
}

function migrateLegacyLanguageUrl(root: Document): void {
  const view = root.defaultView;
  if (!view) return;
  const url = new URL(view.location.href);
  if (!url.searchParams.has("docsLocale")) return;
  const requestedUiLanguage = url.searchParams.get("ui");
  if (requestedUiLanguage !== "en" && requestedUiLanguage !== "ja") {
    url.searchParams.set(
      "ui",
      root.documentElement.lang === "ja" ? "ja" : "en"
    );
  }
  url.searchParams.delete("docsLocale");
  view.history.replaceState(view.history.state, "", url);
}

function allowsIntentPrefetch(view: Window | null): boolean {
  if (!view) return false;
  const connection = (
    view.navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    }
  ).connection;
  return (
    connection?.saveData !== true &&
    connection?.effectiveType !== "slow-2g" &&
    connection?.effectiveType !== "2g"
  );
}
