import { extractHtmlLinks, uniqueRecords } from "../search-index.mjs";

export function normalizeScopedHtmlLinks(html, options) {
  const root = new URL(options.urlRoot);
  const rootPath = root.pathname.replace(/\/+$/, "");
  const records = extractHtmlLinks(html).flatMap(({ href, title }) => {
    const url = new URL(href, options.inputUrl);
    if (url.origin !== root.origin) return [];
    if (url.pathname !== rootPath && !url.pathname.startsWith(`${rootPath}/`)) {
      return [];
    }
    if (options.accept && !options.accept({ title, url })) return [];

    return [
      {
        title,
        url: url.href,
        programmingLanguage: options.programmingLanguage,
        docsLocale: options.docsLocale,
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceKind: options.sourceKind,
        ...(options.section ? { section: options.section } : {})
      }
    ];
  });

  return uniqueRecords(records);
}
