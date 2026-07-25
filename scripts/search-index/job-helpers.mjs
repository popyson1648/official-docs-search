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
        buildUrl: options.buildUrl
      });
      return options.acceptRecord ? records.filter(options.acceptRecord) : records;
    }
  };
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
