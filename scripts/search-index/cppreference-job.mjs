import { normalizeCppreferenceApiPages } from "./cppreference-parsers.mjs";

export function cppreferenceJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: options.docsLocale,
    adapter: "mediawiki-allpages",
    upstreamVersion: `${options.sourceName} rolling`,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    ...(options.qualification ? { qualification: options.qualification } : {}),
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const payloads = [];
      let gapcontinue;
      do {
        const url = new URL("/api.php", options.origin);
        url.search = new URLSearchParams({
          action: "query",
          generator: "allpages",
          gapnamespace: "0",
          gapprefix: `${options.namespacePrefix}/`,
          gaplimit: "max",
          gapfilterredir: "nonredirects",
          prop: "pageprops",
          ppprop: "displaytitle",
          format: "json",
          formatversion: "2",
          ...(gapcontinue ? { gapcontinue } : {})
        }).toString();
        const payload = JSON.parse(await fetchText(url.href));
        payloads.push(payload);
        gapcontinue =
          typeof payload?.continue?.gapcontinue === "string"
            ? payload.continue.gapcontinue
            : undefined;
      } while (gapcontinue);

      return normalizeCppreferenceApiPages(payloads, options);
    }
  };
}
