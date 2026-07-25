import { uniqueRecords } from "../../search-index.mjs";

export function parseMicrosoftGroupCToc(source, options) {
  let toc;
  try {
    toc = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `Invalid Microsoft Learn TOC JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!toc || !Array.isArray(toc.items)) {
    throw new Error("Invalid Microsoft Learn TOC: expected an items array.");
  }

  const records = [];
  visitItems(toc.items, undefined, records, options);
  if (records.length === 0) {
    throw new Error("Invalid Microsoft Learn TOC: no localized links were found.");
  }
  const unique = uniqueRecords(records);
  if (
    options.docsLocale === "ja" &&
    unique.filter((record) => /[ぁ-んァ-ヶ一-龠]/u.test(record.title)).length <
      Math.ceil(unique.length / 2)
  ) {
    throw new Error(
      "Invalid Microsoft Learn Japanese TOC: localized Japanese titles are missing."
    );
  }
  return unique;
}

function visitItems(items, parentTitle, records, options) {
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const title = typeof item.toc_title === "string" ? item.toc_title.trim() : "";
    if (title && typeof item.href === "string") {
      const url = localizedMicrosoftLearnUrl(item.href, options);
      if (url?.startsWith(options.urlPrefix)) {
        records.push({
          title,
          url,
          ...(parentTitle ? { section: parentTitle } : {})
        });
      }
    }
    if (Array.isArray(item.children)) {
      visitItems(item.children, title || parentTitle, records, options);
    }
  }
}

function localizedMicrosoftLearnUrl(href, options) {
  const localizedHref =
    href.startsWith("/") && !href.startsWith(`/${options.siteLocale}/`)
      ? `/${options.siteLocale}${href}`
      : href;
  let url;
  try {
    url = new URL(localizedHref, options.inputUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.hostname !== "learn.microsoft.com") return undefined;
  url.hash = "";
  return url.href;
}
