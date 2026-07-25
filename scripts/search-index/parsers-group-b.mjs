import {
  normalizeSphinxEntries,
  parseJavadocSearchIndex,
  parseSphinxSearchIndex,
  uniqueRecords
} from "../search-index.mjs";

export function normalizeMdnSearchIndex(source, options) {
  const entries = JSON.parse(source);
  if (!Array.isArray(entries)) throw new Error("Invalid MDN search index.");

  const pathPrefix = new URL(options.urlPrefix).pathname.replace(/\/$/, "");
  return uniqueRecords(
    entries.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const title = String(entry.title ?? "").trim();
      const path = String(entry.url ?? "");
      if (
        !title ||
        !path.startsWith("/") ||
        (path !== pathPrefix && !path.startsWith(`${pathPrefix}/`))
      ) {
        return [];
      }
      return [
        {
          title,
          url: new URL(path, "https://developer.mozilla.org").href,
          programmingLanguage: options.programmingLanguage,
          docsLocale: options.docsLocale,
          sourceId: options.sourceId,
          sourceName: options.sourceName,
          sourceKind: options.sourceKind
        }
      ];
    })
  );
}

export function normalizeJavadocTypes(packageSource, typeSource, options) {
  const packages = parseJavadocSearchIndex(packageSource);
  const types = parseJavadocSearchIndex(typeSource);
  const modules = new Map(
    packages
      .filter((entry) => entry.m && entry.l)
      .map((entry) => [entry.l, entry.m])
  );

  return uniqueRecords([
    ...packages.flatMap((entry) => {
      if (!entry.m || !entry.l) return [];
      return [
        {
          title: entry.l,
          url: `${options.urlPrefix}${entry.m}/${entry.l.replaceAll(".", "/")}/package-summary.html`,
          section: entry.m
        }
      ];
    }),
    ...types.flatMap((entry) => {
      const moduleName = modules.get(entry.p);
      if (!moduleName || !entry.p || !entry.l) return [];
      return [
        {
          title: entry.l,
          url: `${options.urlPrefix}${moduleName}/${entry.p.replaceAll(".", "/")}/${entry.l}.html`,
          section: entry.p
        }
      ];
    })
  ]);
}

export function normalizeSoliditySphinxSearchIndex(source, options) {
  return normalizeSphinxEntries(parseSphinxSearchIndex(source), {
    ...options,
    buildUrl: (path, fragment) =>
      `${options.urlPrefix}${path}.html${fragment ? `#${encodeURIComponent(fragment)}` : ""}`
  });
}
