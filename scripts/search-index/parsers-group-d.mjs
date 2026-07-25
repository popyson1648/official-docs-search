import {
  extractHtmlLinks,
  normalizeSphinxEntries,
  parseSphinxSearchIndex,
  uniqueRecords
} from "../search-index.mjs";

export function normalizeDoccNavigator(source, options) {
  const index = JSON.parse(source);
  const roots = Object.values(index.interfaceLanguages ?? {}).flat();
  const records = [];
  const visit = (items, section) => {
    let currentSection = section;
    for (const item of items ?? []) {
      if (!item || typeof item !== "object") continue;
      const title = String(item.title ?? "").trim();
      if (item.type === "groupMarker" && title) {
        currentSection = title;
      } else if (title && typeof item.path === "string" && item.path.startsWith("/")) {
        records.push({
          title,
          url: new URL(item.path.slice(1), options.urlPrefix).href,
          section: currentSection
        });
      }
      visit(item.children, currentSection);
    }
  };
  visit(roots);
  return uniqueRecords(records);
}

export function normalizeSitemap(source, options) {
  const records = [];
  for (const match of source.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    const url = decodeXml(match[1]);
    if (!options.acceptUrl(url)) continue;
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean).at(-1) ?? options.fallbackTitle;
    records.push({
      title: humanizeSlug(slug.replace(/\.html$/, "")) || options.fallbackTitle,
      url: parsed.href
    });
  }
  return uniqueRecords(records);
}

export function normalizeDartdocIndex(source, options) {
  const entries = JSON.parse(source);
  if (!Array.isArray(entries)) throw new Error("Invalid Dartdoc index.");
  return uniqueRecords(
    entries.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const title = String(entry.qualifiedName ?? entry.name ?? "").trim();
      const href = String(entry.href ?? "");
      if (!title || !href || /^(?:[a-z]+:|\/|#)/i.test(href)) return [];
      return [
        {
          title,
          url: new URL(href, options.urlPrefix).href,
          section: String(entry.enclosedBy?.name ?? "").trim() || undefined
        }
      ];
    })
  );
}

export function normalizeElmGuideIndex(source, options) {
  const index = JSON.parse(source);
  if (!index.store || typeof index.store !== "object" || Array.isArray(index.store)) {
    throw new Error("Invalid Elm guide search index.");
  }
  return uniqueRecords(
    Object.values(index.store).flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const title = String(entry.title ?? "").trim();
      const path = String(entry.url ?? "");
      if (!title || !path || /^(?:[a-z]+:|\/\/)/i.test(path)) return [];
      return [{ title, url: new URL(path, options.urlPrefix).href }];
    })
  );
}

export function normalizeElmPackages(source, options) {
  const packages = JSON.parse(source);
  if (!packages || typeof packages !== "object" || Array.isArray(packages)) {
    throw new Error("Invalid Elm package index.");
  }
  return uniqueRecords(
    Object.entries(packages).flatMap(([name, versions]) => {
      if (!/^[a-z0-9-]+\/[a-z0-9-]+$/i.test(name) || !Array.isArray(versions)) return [];
      const version = versions.at(-1);
      if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) return [];
      return [
        {
          title: name,
          url: `${options.urlPrefix}${name}/${version}/`,
          section: version
        }
      ];
    })
  );
}

export function normalizeHtmlToc(source, options) {
  const links = extractHtmlLinks(source);
  if (options.preferLast) links.reverse();
  return uniqueRecords(
    links.flatMap(({ href, title }) => {
      let url;
      try {
        url = new URL(href, options.inputUrl);
      } catch {
        return [];
      }
      if (
        url.protocol !== "https:" ||
        !options.acceptUrl(url) ||
        /^(?:javascript|mailto):/i.test(href)
      ) {
        return [];
      }
      return [{ title, url: url.href }];
    })
  );
}

export function normalizePrettySphinxIndex(source, options) {
  return normalizeSphinxEntries(parseSphinxSearchIndex(source), {
    ...options,
    buildUrl: (path, fragment) => {
      const route = path.replace(/(?:^|\/)index$/, "");
      return `${options.urlPrefix}${route}${route ? "/" : ""}${
        fragment ? `#${encodeURIComponent(fragment)}` : ""
      }`;
    }
  });
}

function humanizeSlug(value) {
  return decodeURIComponent(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
