import { normalizeDevdocsEntries, uniqueRecords } from "../search-index.mjs";

export function devdocsJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: options.docsLocale ?? "en",
    adapter: "devdocs",
    upstreamVersion: options.upstreamVersion,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: options.maximumRecordDropRatio ?? 0.2,
    maximumSizeChangeRatio: options.maximumSizeChangeRatio ?? 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: options.updateFrequency ?? "weekly",
    load: async ({ fetchText }) => {
      const records = normalizeDevdocsEntries(JSON.parse(await fetchText(options.inputUrl)), {
        sourceId: options.sourceId,
        programmingLanguage: options.programmingLanguage,
        docsLocale: options.docsLocale ?? "en",
        sourceKind: options.sourceKind,
        sourceName: options.sourceName,
        buildUrl: options.buildUrl,
        resolvePath: options.resolvePath
      });
      return options.acceptRecord ? records.filter(options.acceptRecord) : records;
    }
  };
}

const RUSTDOC_ITEM_SEGMENT = /^([a-z]+)\.(.+)$/;

/**
 * DevDocs lowercases every index path, but doc.rust-lang.org serves
 * case-sensitive `<kind>.<Item>.html` pages. The DevDocs entry name keeps the
 * upstream case, so the final path segment is restored from it. Module
 * segments and `method`/`tymethod` fragments stay snake_case upstream and are
 * left untouched.
 */
export function restoreRustdocPathCase(path, entry) {
  const [pathname, fragment] = String(path).split("#", 2);
  const segments = pathname.split("/");
  const match = RUSTDOC_ITEM_SEGMENT.exec(segments[segments.length - 1]);
  if (!match) return path;
  const [, kind, item] = match;
  const named = String(entry?.name ?? "")
    .split("::")
    .reverse()
    .find((segment) => segment.toLowerCase() === item);
  if (!named || named === item) return path;
  segments[segments.length - 1] = `${kind}.${named}`;
  return `${segments.join("/")}${fragment ? `#${fragment}` : ""}`;
}

export function documentationUrl(baseUrl, path) {
  const [pathname, fragment] = path.split("#", 2);
  const suffix = pathname.endsWith(".html") ? pathname : `${pathname}.html`;
  return `${baseUrl}${suffix}${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
}

export function linkRecords(links, inputUrl, requiredPrefix) {
  return uniqueRecords(
    links.flatMap(({ href, title }) => {
      const url = new URL(href, inputUrl).href;
      if (requiredPrefix && !url.startsWith(requiredPrefix)) return [];
      return [{ title, url }];
    })
  );
}
