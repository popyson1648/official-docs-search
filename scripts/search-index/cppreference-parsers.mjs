import { plainHtmlText, uniqueRecords } from "../search-index.mjs";

export function normalizeCppreferenceApiPages(payloads, options) {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    throw new Error("Invalid cppreference MediaWiki API data.");
  }
  const expectedPrefix = `${options.namespacePrefix}/`;
  return uniqueRecords(
    payloads.flatMap((payload) => {
      if (!Array.isArray(payload?.query?.pages)) {
        throw new Error("Invalid cppreference MediaWiki API response.");
      }
      return payload.query.pages.flatMap((page) => {
        const pageName = String(page.title ?? "");
        if (!pageName.startsWith(expectedPrefix)) return [];
        const suffix = pageName.slice(expectedPrefix.length);
        if (!suffix) return [];
        const displayTitle =
          plainHtmlText(page.pageprops?.displaytitle) ||
          suffix.split("/").at(-1)?.replaceAll("_", " ") ||
          suffix;
        return [
          {
            title: displayTitle,
            url: new URL(suffix, options.urlPrefix).href,
            programmingLanguage: options.programmingLanguage,
            docsLocale: options.docsLocale,
            sourceId: options.sourceId,
            sourceName: options.sourceName,
            sourceKind: "community",
            section: suffix.split("/").slice(0, -1).join(" / ") || options.sourceName
          }
        ];
      });
    })
  );
}
