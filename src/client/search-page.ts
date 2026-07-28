import { initializeBackToTop } from "./back-to-top";
import { initializeSearchControls } from "./search-controls";
import { initializeSearchPage, warmSearchPage } from "./search-results";

export async function initializeClientSearchPage(root: Document = document): Promise<void> {
  initializeBackToTop(root);
  initializeSearchControls(root, {
    onLanguageIntent: async (docsLocale) => {
      await warmSearchPage(root, docsLocale);
    },
    onLanguageChange: async (_docsLocale, warmup) => {
      await initializeSearchPage(root, fetch, warmup);
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
