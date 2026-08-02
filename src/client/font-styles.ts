const FONT_LINK_ATTRIBUTE = "data-loaded-font-stylesheet";

export function initializeFontStyles(root: Document = document): void {
  ensureFontStylesheet(root, "alexandria");
  ensureRequiredJapaneseFontStyles(root);
}

export function ensureRequiredJapaneseFontStyles(
  root: Document = document
): void {
  const resultsLocale = root.querySelector<HTMLElement>(
    "[data-search-results]"
  )?.dataset.docsLocale;
  if (
    root.documentElement.lang === "ja" ||
    root.documentElement.dataset.needsJapaneseFont === "true" ||
    resultsLocale === "ja"
  ) {
    ensureFontStylesheet(root, "line-seed-jp");
  }
}

export function ensureJapaneseFontStyles(root: Document = document): void {
  ensureFontStylesheet(root, "line-seed-jp");
}

function ensureFontStylesheet(
  root: Document,
  family: "alexandria" | "line-seed-jp"
): void {
  if (root.head.querySelector(`link[${FONT_LINK_ATTRIBUTE}="${family}"]`)) {
    return;
  }
  const key = family === "alexandria" ? "fontAlexandriaUrl" : "fontLineSeedJpUrl";
  const href = root.documentElement.dataset[key];
  if (!href) return;
  const link = root.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute(FONT_LINK_ATTRIBUTE, family);
  root.head.append(link);
}
