import { buildHighlightSpans } from "../core/highlight";
import { parseQuery } from "../core/query";
import {
  preferenceCookie,
  removeLanguageFromQuery,
  resolveSourceOptionState
} from "../core/search-controls";
import type { SourceKind } from "../core/sources";

export interface SearchControlCallbacks {
  onDocsLocaleChange?(docsLocale: string): void | Promise<void>;
}

export function initializeSearchControls(
  root: Document = document,
  callbacks: SearchControlCallbacks = {}
): void {
  const input = root.querySelector<HTMLInputElement>("[data-query-input]");
  const highlight = root.querySelector<HTMLElement>("[data-query-highlight]");
  const form = root.querySelector<HTMLFormElement>("[data-search-form]");
  const uiHidden = root.querySelector<HTMLInputElement>("[data-ui-hidden]");
  const sourceToggle = root.querySelector<HTMLInputElement>("[data-source-toggle]");
  const uiRadios = root.querySelectorAll<HTMLInputElement>("[data-ui-radio]");
  const docsRadios = root.querySelectorAll<HTMLInputElement>("[data-docs-radio]");
  const dialog = root.querySelector<HTMLDialogElement>("[data-help-dialog]");
  const helpOpen = root.querySelector<HTMLButtonElement>("[data-help-open]");
  const queryStack = root.querySelector<HTMLElement>("[data-query-stack]");
  const knownLanguages = parseKnownLanguages(queryStack?.dataset.knownLanguages);

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
  input?.addEventListener("scroll", () => {
    if (highlight) highlight.scrollLeft = input.scrollLeft;
  });

  uiRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      root.cookie = preferenceCookie("ui", radio.value);
      if (uiHidden) uiHidden.value = radio.value;
      root.documentElement.lang = radio.value;
      uiRadios.forEach((candidate) => candidate.parentElement?.classList.remove("active"));
      if (radio.checked) radio.parentElement?.classList.add("active");
    });
  });

  sourceToggle?.addEventListener("change", () => {
    sourceToggle.parentElement?.classList.toggle("active", sourceToggle.checked);
    const optionElements = [
      ...(form?.querySelectorAll<HTMLInputElement>("[data-source-option]") ?? [])
    ];
    const state = resolveSourceOptionState(
      optionElements.map((option) => ({
        id: option.value,
        kind: sourceKind(option.dataset.sourceKind),
        checked: option.checked
      })),
      sourceToggle.checked
    );
    form?.querySelectorAll("[data-preserved-source]").forEach((element) => element.remove());
    for (const [index, option] of optionElements.entries()) {
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
    root.cookie = preferenceCookie("sourceMode", sourceToggle.checked ? "all" : "official");
    form?.requestSubmit();
  });

  docsRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      root.cookie = preferenceCookie("docsLocale", radio.value);
      updateDocsLocaleUrl(root, radio.value);
      const effectiveLocale = form?.dataset.queryLocale || radio.value;
      if (form) form.dataset.docsLocale = effectiveLocale;
      if (results) results.dataset.docsLocale = effectiveLocale;
      updateDocsRadioState(docsRadios, effectiveLocale);
      updateLocaleNotice(root, effectiveLocale);
      void callbacks.onDocsLocaleChange?.(effectiveLocale);
    });
  });

  const results = root.querySelector<HTMLElement>("[data-search-results]");
  form?.querySelectorAll<HTMLInputElement>("[data-source-option]").forEach((option) => {
    option.addEventListener("change", () => {
      updateLocaleNotice(root, form.dataset.docsLocale ?? "");
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

  renderHighlight();
  updateLocaleNotice(root, form?.dataset.docsLocale ?? "");
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

function sourceKind(value: string | undefined): SourceKind {
  if (value === "conventional" || value === "community") return value;
  return "official";
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

function updateLocaleNotice(root: Document, docsLocale: string): void {
  const notice = root.querySelector<HTMLElement>("[data-locale-notice]");
  if (!notice) return;
  const hasActiveQuery = notice.dataset.hasQuery === "true";
  const hasUnsupportedSelection =
    docsLocale === "ja" &&
    [...root.querySelectorAll<HTMLInputElement>("[data-source-option]")].some(
      (option) =>
        option.checked &&
        !option.disabled &&
        option.dataset.supportsJa !== "true"
    );
  notice.hidden = hasActiveQuery || !hasUnsupportedSelection;
}
