import type { ResultFilterSource } from "../core/result-filters";
import type { SearchFacet } from "../core/search";
import { t } from "../core/i18n";

export type ResultFilterFacet = "language" | "site";

export interface ResultFilterState {
  languageIds: Set<string>;
  sourceIds: Set<string>;
  activeFacet: ResultFilterFacet;
  open: boolean;
}

export interface ResultFilterChange {
  languageIds: ReadonlySet<string>;
  sourceIds: ReadonlySet<string>;
}

export interface ResultFilterControl {
  setBusy(busy: boolean): void;
  destroy(): void;
}

interface ResultFilterOptions {
  sources: ResultFilterSource[];
  facets: SearchFacet[];
  state: ResultFilterState;
  onChange(selection: ResultFilterChange): void | Promise<void>;
}

interface FilterChoice {
  id: string;
  label: string;
}

const TOOLBAR_VIEWPORT_GUTTER = 20;

export function initializeResultFilters(
  root: Document,
  mount: HTMLElement,
  options: ResultFilterOptions
): ResultFilterControl | undefined {
  const view = root.defaultView;
  const matchingSourceIds = new Set(options.facets.map((facet) => facet.sourceId));
  const matchingSources = options.sources.filter((source) => matchingSourceIds.has(source.id));
  const languageChoices = uniqueChoices(
    matchingSources.map((source) => ({
      id: source.programmingLanguage,
      label: source.programmingLanguageName ?? source.programmingLanguage
    }))
  );
  const siteChoices = uniqueChoices(
    options.facets.map((facet) => ({
      id: facet.sourceId,
      label: matchingSources.find((source) => source.id === facet.sourceId)?.name ?? facet.sourceName
    }))
  );
  const availableFacets: ResultFilterFacet[] = [
    ...(languageChoices.length > 1 ? (["language"] as const) : []),
    ...(siteChoices.length > 1 ? (["site"] as const) : [])
  ];

  mount.replaceChildren();
  if (availableFacets.length === 0) {
    mount.hidden = true;
    return undefined;
  }

  if (!availableFacets.includes(options.state.activeFacet)) {
    options.state.activeFacet = availableFacets[0];
  }

  const shell = root.createElement("div");
  shell.className = "result-filter-shell";
  shell.dataset.resultFilterShell = "";

  const controlWrap = root.createElement("div");
  controlWrap.className = "result-filter-control-wrap";

  const controls = root.createElement("div");
  controls.className = "result-filter-controls";
  controls.setAttribute("role", "toolbar");
  appendLocalizedText(root, controls, t("en", "resultFilters"), t("ja", "resultFilters"), true);

  const inline = root.createElement("div");
  inline.className = "result-filter-inline";

  const trigger = iconButton(root, "result-filter-trigger", "filterResults", "filter");
  trigger.dataset.resultFilterOpen = "";
  trigger.setAttribute("aria-expanded", String(options.state.open));
  trigger.setAttribute("aria-controls", "result-filter-panel");

  const back = iconButton(root, "result-filter-back", "backToTools", "back");
  back.dataset.resultFilterClose = "";
  back.hidden = !options.state.open;

  const fields = root.createElement("div");
  fields.className = "result-filter-fields";
  fields.id = "result-filter-fields";
  fields.setAttribute("role", "region");
  fields.hidden = !options.state.open;

  const propertyGroup = root.createElement("div");
  propertyGroup.className = "result-filter-properties";
  propertyGroup.setAttribute("role", "group");
  appendLocalizedText(
    root,
    propertyGroup,
    t("en", "filterResults"),
    t("ja", "filterResults"),
    true
  );

  const panel = root.createElement("div");
  panel.id = "result-filter-panel";
  panel.className = "result-filter-panel";
  panel.setAttribute("role", "region");
  panel.hidden = !options.state.open;
  const panelLabel = root.createElement("span");
  panelLabel.id = "result-filter-panel-label";
  appendLocalizedText(root, panelLabel, t("en", "filterResults"), t("ja", "filterResults"), true);
  panel.setAttribute("aria-labelledby", panelLabel.id);
  panel.append(panelLabel);

  const applied = root.createElement("div");
  applied.className = "result-filter-applied";
  applied.dataset.resultFilterApplied = "";
  applied.setAttribute("aria-live", "polite");

  const facetButtons = new Map<ResultFilterFacet, HTMLButtonElement>();
  for (const facet of availableFacets) {
    const button = localizedButton(
      root,
      "result-filter-property",
      facet === "language" ? "filterLanguage" : "filterSite"
    );
    button.dataset.resultFilterFacet = facet;
    propertyGroup.append(button);
    facetButtons.set(facet, button);
  }

  fields.append(propertyGroup);
  inline.append(trigger, back, fields);
  controls.append(inline);
  controlWrap.append(controls, panel);
  shell.append(controlWrap, applied);
  mount.append(shell);
  mount.hidden = false;

  let listening = false;
  let destroyed = false;

  const notifyChange = () => {
    void options.onChange({
      languageIds: new Set(options.state.languageIds),
      sourceIds: new Set(options.state.sourceIds)
    });
  };

  const hasFilters = () =>
    options.state.languageIds.size > 0 || options.state.sourceIds.size > 0;

  const visibleInlineChildren = () =>
    [...inline.children].filter((element) => (element as HTMLElement).getClientRects().length > 0);

  const measureControlsWidth = () => {
    const children = visibleInlineChildren();
    if (children.length === 0) return controls.getBoundingClientRect().width;
    const style = view?.getComputedStyle(controls);
    const extra = style
      ? Number.parseFloat(style.paddingLeft) +
        Number.parseFloat(style.paddingRight) +
        Number.parseFloat(style.borderLeftWidth) +
        Number.parseFloat(style.borderRightWidth)
      : 0;
    const span =
      children[children.length - 1].getBoundingClientRect().right -
      children[0].getBoundingClientRect().left;
    return Math.min(
      span + extra,
      Math.max(0, (view?.innerWidth ?? root.documentElement.clientWidth) - TOOLBAR_VIEWPORT_GUTTER)
    );
  };

  const pinControlsWidth = () => {
    controls.style.transitionDuration = "0ms";
    controls.style.width = `${measureControlsWidth()}px`;
  };

  const animateSwappedContent = () => {
    inline.getAnimations().forEach((animation) => animation.cancel());
    if (!view || view.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    inline.animate(
      [
        { opacity: 0, transform: "translateX(7px)" },
        { opacity: 1, transform: "translateX(0)" }
      ],
      {
        duration: 220,
        easing: "cubic-bezier(0.2, 0, 0, 1)"
      }
    );
  };

  const morphControls = (expanded: boolean) => {
    const start = controls.getBoundingClientRect().width;
    trigger.hidden = expanded;
    back.hidden = !expanded;
    fields.hidden = !expanded;
    const target = measureControlsWidth();
    controls.style.transitionDuration = target >= start ? "260ms" : "180ms";
    controls.style.width = `${start}px`;
    void controls.offsetWidth;
    controls.style.width = `${target}px`;
    animateSwappedContent();
  };

  const updateTriggerState = () => {
    trigger.classList.toggle("active", hasFilters());
    trigger.setAttribute("aria-expanded", String(options.state.open));
  };

  const onDocumentPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (target instanceof Node && !shell.contains(target)) closePanel(false);
  };

  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !options.state.open) return;
    event.preventDefault();
    closePanel(true);
  };

  const startListening = () => {
    if (listening) return;
    root.addEventListener("pointerdown", onDocumentPointerDown, true);
    root.addEventListener("keydown", onDocumentKeyDown);
    listening = true;
  };

  const stopListening = () => {
    if (!listening) return;
    root.removeEventListener("pointerdown", onDocumentPointerDown, true);
    root.removeEventListener("keydown", onDocumentKeyDown);
    listening = false;
  };

  const closePanel = (restoreFocus: boolean) => {
    if (!options.state.open) return;
    options.state.open = false;
    panel.hidden = true;
    morphControls(false);
    updateTriggerState();
    stopListening();
    if (restoreFocus) trigger.focus({ preventScroll: true });
  };

  const openPanel = () => {
    if (options.state.open) return;
    options.state.open = true;
    renderFacet();
    panel.hidden = false;
    morphControls(true);
    updateTriggerState();
    startListening();
    back.focus({ preventScroll: true });
  };

  const renderApplied = () => {
    applied.replaceChildren();
    const selectedFacets = [
      {
        facet: "language" as const,
        choices: languageChoices.filter((choice) => options.state.languageIds.has(choice.id))
      },
      {
        facet: "site" as const,
        choices: siteChoices.filter((choice) => options.state.sourceIds.has(choice.id))
      }
    ].filter(({ choices }) => choices.length > 0);

    if (selectedFacets.length === 0) {
      applied.hidden = true;
      updateTriggerState();
      return;
    }

    for (const { facet, choices } of selectedFacets) {
      const pill = root.createElement("span");
      pill.className = "result-filter-active-pill";
      pill.dataset.resultFilterActiveFacet = facet;

      const label = root.createElement("span");
      label.className = "result-filter-active-label";

      const category = root.createElement("span");
      category.className = "result-filter-active-category";
      appendLocalizedText(
        root,
        category,
        t("en", facet === "language" ? "filterLanguage" : "filterSite"),
        t("ja", facet === "language" ? "filterLanguage" : "filterSite")
      );

      const value = root.createElement("span");
      value.className = "result-filter-active-value";
      value.textContent = choices.map((choice) => choice.label).join(", ");
      label.append(category, value);

      const remove = root.createElement("button");
      remove.type = "button";
      remove.className = "result-filter-remove";
      remove.dataset.resultFilterRemove = facet;
      const removeMark = svgIcon(root, "close");
      removeMark.setAttribute("aria-hidden", "true");
      remove.append(removeMark);
      appendLocalizedText(
        root,
        remove,
        t("en", "removeFilter").replace(
          "{filter}",
          t("en", facet === "language" ? "filterLanguage" : "filterSite")
        ),
        t("ja", "removeFilter").replace(
          "{filter}",
          t("ja", facet === "language" ? "filterLanguage" : "filterSite")
        ),
        true
      );

      pill.append(label, remove);
      applied.append(pill);
    }

    const clear = localizedButton(root, "result-filter-clear", "clearAllFilters");
    clear.dataset.resultFilterClear = "";
    applied.append(clear);
    applied.hidden = false;
    updateTriggerState();
  };

  const renderFacet = () => {
    const activeFacet = options.state.activeFacet;
    for (const [facet, button] of facetButtons) {
      const active = facet === activeFacet;
      button.classList.toggle("on", active);
      button.setAttribute("aria-pressed", String(active));
    }

    panel.replaceChildren(panelLabel);
    const choiceLabel = root.createElement("span");
    choiceLabel.id = `result-filter-choice-label-${activeFacet}`;
    appendLocalizedText(
      root,
      choiceLabel,
      t("en", activeFacet === "language" ? "filterLanguage" : "filterSite"),
      t("ja", activeFacet === "language" ? "filterLanguage" : "filterSite"),
      true
    );

    const choices = activeFacet === "language" ? languageChoices : siteChoices;
    const selectedIds =
      activeFacet === "language" ? options.state.languageIds : options.state.sourceIds;
    const choiceGroup = root.createElement("div");
    choiceGroup.className = "result-filter-choices";
    choiceGroup.setAttribute("role", "group");
    choiceGroup.setAttribute("aria-labelledby", choiceLabel.id);
    choiceGroup.append(choiceLabel);
    for (const choice of choices) {
      const button = root.createElement("button");
      button.type = "button";
      button.className = "result-filter-choice";
      button.dataset.resultFilterChoice = activeFacet;
      button.dataset.resultFilterValue = choice.id;
      button.classList.toggle("on", selectedIds.has(choice.id));
      button.setAttribute("aria-pressed", String(selectedIds.has(choice.id)));
      button.textContent = choice.label;
      choiceGroup.append(button);
    }
    panel.append(choiceGroup);
  };

  trigger.addEventListener("click", openPanel);
  back.addEventListener("click", () => closePanel(true));
  shell.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const facetButton = target.closest<HTMLButtonElement>("[data-result-filter-facet]");
    if (facetButton) {
      options.state.activeFacet =
        facetButton.dataset.resultFilterFacet === "site" ? "site" : "language";
      renderFacet();
      morphControls(true);
      return;
    }

    const choice = target.closest<HTMLButtonElement>("[data-result-filter-choice]");
    if (choice) {
      const value = choice.dataset.resultFilterValue;
      if (!value) return;
      const selectedIds =
        choice.dataset.resultFilterChoice === "site"
          ? options.state.sourceIds
          : options.state.languageIds;
      if (selectedIds.has(value)) selectedIds.delete(value);
      else selectedIds.add(value);
      choice.classList.toggle("on", selectedIds.has(value));
      choice.setAttribute("aria-pressed", String(selectedIds.has(value)));
      renderApplied();
      notifyChange();
      return;
    }

    const remove = target.closest<HTMLButtonElement>("[data-result-filter-remove]");
    if (remove) {
      const selectedIds =
        remove.dataset.resultFilterRemove === "site"
          ? options.state.sourceIds
          : options.state.languageIds;
      selectedIds.clear();
      renderFacet();
      renderApplied();
      notifyChange();
      return;
    }

    if (target.closest("[data-result-filter-clear]")) {
      options.state.languageIds.clear();
      options.state.sourceIds.clear();
      renderFacet();
      renderApplied();
      notifyChange();
    }
  });

  const onResize = () => pinControlsWidth();
  view?.addEventListener("resize", onResize);

  renderFacet();
  renderApplied();
  if (options.state.open) {
    trigger.hidden = true;
    back.hidden = false;
    fields.hidden = false;
    panel.hidden = false;
    startListening();
  }
  pinControlsWidth();

  let fontsLive = true;
  void root.fonts?.ready.then(() => {
    if (fontsLive && !destroyed) pinControlsWidth();
  });

  return {
    setBusy(busy: boolean) {
      shell.setAttribute("aria-busy", String(busy));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      fontsLive = false;
      stopListening();
      view?.removeEventListener("resize", onResize);
      inline.getAnimations().forEach((animation) => animation.cancel());
    }
  };
}

function localizedButton(
  root: Document,
  className: string,
  messageKey: string
): HTMLButtonElement {
  const button = root.createElement("button");
  button.type = "button";
  button.className = className;
  appendLocalizedText(root, button, t("en", messageKey), t("ja", messageKey));
  return button;
}

function iconButton(
  root: Document,
  className: string,
  messageKey: string,
  icon: "filter" | "back"
): HTMLButtonElement {
  const button = root.createElement("button");
  button.type = "button";
  button.className = className;
  const graphic = svgIcon(root, icon);
  graphic.setAttribute("aria-hidden", "true");
  button.append(graphic);
  appendLocalizedText(root, button, t("en", messageKey), t("ja", messageKey), true);
  return button;
}

function svgIcon(
  root: Document,
  icon: "filter" | "back" | "close"
): SVGSVGElement {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = root.createElementNS(namespace, "svg");
  svg.setAttribute("width", icon === "close" ? "13" : "16");
  svg.setAttribute("height", icon === "close" ? "13" : "16");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = root.createElementNS(namespace, "path");
  path.setAttribute(
    "d",
    icon === "filter"
      ? "M3 5h18M6 12h12M10 19h4"
      : icon === "back"
        ? "M19 12H5M11 6l-6 6 6 6"
        : "M6 6l12 12M18 6L6 18"
  );
  svg.append(path);
  return svg;
}

function appendLocalizedText(
  root: Document,
  element: HTMLElement,
  en: string,
  ja: string,
  screenReaderOnly = false
): void {
  const enSpan = root.createElement("span");
  enSpan.className = `lang-en${screenReaderOnly ? " sr-only" : ""}`;
  enSpan.textContent = en;
  const jaSpan = root.createElement("span");
  jaSpan.className = `lang-ja${screenReaderOnly ? " sr-only" : ""}`;
  jaSpan.textContent = ja;
  element.append(enSpan, jaSpan);
}

function uniqueChoices(choices: FilterChoice[]): FilterChoice[] {
  const byId = new Map<string, FilterChoice>();
  for (const choice of choices) {
    if (!byId.has(choice.id)) byId.set(choice.id, choice);
  }
  return [...byId.values()].sort((left, right) => left.label.localeCompare(right.label));
}
