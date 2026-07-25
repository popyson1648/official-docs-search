import { uniqueRecords } from "../search-index.mjs";

export function findExDocSidebarUrl(html, pageUrl, allowedPrefix = pageUrl) {
  const match = html.match(/\bsrc=["']([^"']*\/sidebar_items-[^"']+\.js)["']/i);
  if (!match) throw new Error("ExDoc sidebar index was not found.");
  const url = new URL(match[1], pageUrl);
  if (!url.href.startsWith(allowedPrefix)) {
    throw new Error("ExDoc sidebar index is outside the reviewed documentation scope.");
  }
  return url.href;
}

export function normalizeBashDevdocs(index, documents, options) {
  if (!Array.isArray(index?.entries) || !documents || typeof documents !== "object") {
    throw new Error("Invalid Bash DevDocs data.");
  }

  const pageHeadings = new Map();
  for (const [path, html] of Object.entries(documents)) {
    if (typeof html !== "string") continue;
    const match = html.match(/<h[1-6]\b[^>]*\bid=["']([^"']+)["']/i);
    if (match) pageHeadings.set(path, match[1]);
  }

  return uniqueRecords(
    index.entries.flatMap((entry) => {
      const title = cleanTitle(entry.name);
      const [path, fragment] = String(entry.path ?? "").split("#", 2);
      const targetFragment =
        fragment || pageHeadings.get(path) || title.replace(/\s+/g, "-");
      if (!title || !targetFragment) return [];
      return [
        record(
          title,
          `${options.baseUrl}#${encodeURIComponent(targetFragment)}`,
          options,
          cleanTitle(entry.type) || options.section
        )
      ];
    })
  );
}

export function normalizeExDocSidebar(source, options) {
  const index = parseAssignedJson(source, "ExDoc sidebar index");
  const records = [];

  for (const collection of ["modules", "extras", "tasks"]) {
    for (const item of index[collection] ?? []) {
      const pageTitle = cleanTitle(item.title ?? item.id);
      const pageUrl = new URL(`${item.id}.html`, options.baseUrl).href;
      if (pageTitle) {
        records.push(record(pageTitle, pageUrl, options, options.section));
      }

      for (const header of item.headers ?? []) {
        const title = cleanTitle(header.id ?? header.title);
        if (!title || !header.anchor) continue;
        records.push(
          record(title, withFragment(pageUrl, header.anchor), options, pageTitle)
        );
      }

      for (const group of item.nodeGroups ?? []) {
        for (const node of group.nodes ?? []) {
          const title = cleanTitle(node.title ?? node.id);
          if (!title || !node.anchor) continue;
          records.push(
            record(title, withFragment(pageUrl, node.anchor), options, pageTitle)
          );
        }
      }
    }
  }

  return uniqueRecords(records);
}

export function normalizeDocumenterSearchIndex(source, options) {
  const index = parseAssignedJson(source, "Documenter search index");
  if (!Array.isArray(index.docs)) {
    throw new Error("Invalid Documenter search index.");
  }

  return uniqueRecords(
    index.docs.flatMap((entry) => {
      const title = cleanTitle(entry.title ?? entry.page);
      if (!title || !entry.location) return [];
      return [
        record(
          title,
          new URL(String(entry.location), options.baseUrl).href,
          options,
          cleanTitle(entry.page) || options.section
        )
      ];
    })
  );
}

export function normalizePerlDevdocs(index, options) {
  if (!Array.isArray(index?.entries)) {
    throw new Error("Invalid Perl DevDocs index.");
  }

  return uniqueRecords(
    index.entries.flatMap((entry) => {
      const title = cleanTitle(entry.name);
      const path = String(entry.path ?? "");
      if (!title || !path) return [];
      const [pathname, fragment] = path.split("#", 2);
      const documentName =
        entry.type === "Standard Modules" && pathname.includes("::")
          ? title
          : pathname;
      const url = new URL(`./${documentName}`, options.baseUrl);
      if (fragment) url.hash = fragment;
      return [
        record(
          title,
          url.href,
          options,
          cleanTitle(entry.type) || options.section
        )
      ];
    })
  );
}

export function normalizeSitemap(source, options) {
  const matches = [...source.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)];
  if (matches.length === 0) throw new Error("Invalid or empty sitemap.");

  return uniqueRecords(
    matches.flatMap((match) => {
      const url = decodeXml(match[1]);
      if (!options.urlPrefixes.some((prefix) => url.startsWith(prefix))) return [];
      return [
        record(
          titleFromUrl(url),
          url,
          options,
          options.section
        )
      ];
    })
  );
}

export function titleFromUrl(value) {
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  const raw = /^index\.html?$/i.test(last ?? "")
    ? segments.at(-2) ?? last
    : last ?? url.hostname;
  const withoutExtension = raw.replace(/\.(?:html?|xml)$/i, "");
  const decoded = decodeURIComponent(withoutExtension);
  const title = decoded.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return title || "Documentation";
}

function parseAssignedJson(source, label) {
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`Invalid ${label}.`);
  const value = JSON.parse(source.slice(start, end + 1));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

function record(title, url, options, section) {
  return {
    title,
    url,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    sourceId: options.sourceId,
    sourceName: options.sourceName,
    sourceKind: options.sourceKind,
    ...(section ? { section } : {})
  };
}

function withFragment(url, fragment) {
  const value = new URL(url);
  value.hash = String(fragment);
  return value.href;
}

function cleanTitle(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}
