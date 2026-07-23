import { initializeSearchControls } from "./search-controls";
import { initializeSearchPage } from "./search-results";

export async function initializeClientSearchPage(root: Document = document): Promise<void> {
  initializeSearchControls(root);
  await initializeSearchPage(root);
}
