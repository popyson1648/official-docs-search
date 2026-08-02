import { initializeBackToTop } from "./back-to-top";
import {
  ensureJapaneseFontStyles,
  ensureRequiredJapaneseFontStyles,
  initializeFontStyles
} from "./font-styles";
import { initializeSearchControls } from "./search-controls";
import { initializeSearchPage, warmSearchPage } from "./search-results";
import { initializeThemeMenu } from "./theme-menu";

export async function initializeClientSearchPage(root: Document = document): Promise<void> {
  initializeFontStyles(root);
  initializeBackToTop(root);
  initializeThemeMenu(root);
  initializeSearchControls(root, {
    onLanguageIntent: async (docsLocale) => {
      if (docsLocale === "ja") ensureJapaneseFontStyles(root);
      await warmSearchPage(root, docsLocale);
    },
    onLanguageChange: async (docsLocale, warmup) => {
      if (docsLocale === "ja") ensureJapaneseFontStyles(root);
      await initializeSearchPage(root, fetch, warmup);
    },
    onSearchSubmit: async () => {
      ensureRequiredJapaneseFontStyles(root);
      await initializeSearchPage(root);
    }
  });
  focusSearchInput(root);
  await initializeSearchPage(root);
}

function focusSearchInput(root: Document): void {
  const input = root.querySelector<HTMLInputElement>("[data-query-input][autofocus]");
  const activeElement = root.activeElement;
  if (
    !input ||
    (activeElement !== root.body &&
      activeElement !== root.documentElement &&
      activeElement !== null)
  ) {
    return;
  }
  input.focus();
}
