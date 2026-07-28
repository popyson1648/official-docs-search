import { buildHighlightSpans } from "../core/highlight";
import { t } from "../core/i18n";
import { parseQuery, tokenize } from "../core/query";
import {
  isSourcePolicy,
  preferenceCookie,
  removeLanguageFromQuery,
  resolveSourceOptionState,
  type SourcePolicy
} from "../core/search-controls";
import type { SourceKind } from "../core/sources";
import {
  searchForSuggestions,
  type SearchSuggestion
} from "./search-results";

export interface SearchControlCallbacks {
  onDocsLocaleChange?(docsLocale: string): void | Promise<void>;
}

interface SuggestionScope {
  id: string;
  aliases: string[];
  autoNonOfficialFallback: boolean;
  sources: Array<{ id: string; name: string; kind: SourceKind }>;
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
  const uiRadios = root.querySelectorAll<HTMLInputElement>("[data-ui-radio]");
  const docsRadios = root.querySelectorAll<HTMLInputElement>("[data-docs-radio]");
  const dialog = root.querySelector<HTMLDialogElement>("[data-help-dialog]");
  const helpOpen = root.querySelector<HTMLButtonElement>("[data-help-open]");
  const queryStack = root.querySelector<HTMLElement>("[data-query-stack]");
  const suggestions = root.querySelector<HTMLElement>("[data-search-suggestions]");
  const knownLanguages = parseKnownLanguages(queryStack?.dataset.knownLanguages);
  const suggestionScopes = parseSuggestionScopes(
    queryStack?.dataset.suggestionScopes
  );
  let suggestionTimer: number | undefined;
  let suggestionSequence = 0;
  let activeSuggestion = -1;
  let composing = false;
  let renderedSuggestions: SearchSuggestion[] = [];

  restoreSourceDetailsState(root, sourceDetails);

  const renderHighlight = () => {
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
    if (composing) event.preventDefault();
  });

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
    radio.addEventListener("change", () => {
      root.cookie = preferenceCookie("ui", radio.value);
      if (uiHidden) uiHidden.value = radio.value;
      root.documentElement.lang = radio.value;
      const nextUiLanguage = radio.value === "ja" ? "ja" : "en";
      root.title = t(nextUiLanguage, "title");
      root
        .querySelector<HTMLElement>("[data-back-to-top]")
        ?.setAttribute("aria-label", t(nextUiLanguage, "pageTop"));
      uiRadios.forEach((candidate) => candidate.parentElement?.classList.remove("active"));
      if (radio.checked) radio.parentElement?.classList.add("active");
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

  docsRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      root.cookie = preferenceCookie("docsLocale", radio.value);
      updateDocsLocaleUrl(root, radio.value);
      const effectiveLocale = form?.dataset.queryLocale || radio.value;
      if (form) form.dataset.docsLocale = effectiveLocale;
      if (results) results.dataset.docsLocale = effectiveLocale;
      updateDocsRadioState(docsRadios, effectiveLocale);
      void callbacks.onDocsLocaleChange?.(effectiveLocale);
    });
  });

  const results = root.querySelector<HTMLElement>("[data-search-results]");

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

  renderHighlight();
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

function updateDocsLocaleUrl(root: Document, docsLocale: string): void {
  const view = root.defaultView;
  if (!view) return;
  const url = new URL(view.location.href);
  if (docsLocale) url.searchParams.set("docsLocale", docsLocale);
  else url.searchParams.delete("docsLocale");
  view.history.replaceState(view.history.state, "", url);
}

function updateDocsRadioState(
  radios: NodeListOf<HTMLInputElement>,
  docsLocale: string
): void {
  radios.forEach((radio) => {
    const active = radio.value === docsLocale;
    radio.checked = active;
    radio.parentElement?.classList.toggle("active", active);
  });
}
