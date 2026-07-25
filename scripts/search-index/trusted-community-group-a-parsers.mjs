import { parse } from "parse5";
import { extractHtmlLinks, uniqueRecords } from "../search-index.mjs";

export function normalizeMarkdownSummary(source, options) {
  const records = [];
  let section = options.section ?? options.sourceName;

  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^#\s+(.+?)\s*$/);
    if (heading) {
      section = plainMarkdown(heading[1]);
      continue;
    }

    const link = line.match(
      /^\s*(?:[-*]\s+)?\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/
    );
    if (!link) continue;
    records.push(
      record(plainMarkdown(link[1]), options.buildUrl(link[2]), section, options)
    );
  }

  return requireRecords(uniqueRecords(records), "Markdown summary");
}

export function normalizeGitBookSummary(summarySource, sitemapSource, options) {
  const summaryEntries = [];
  let section = options.sourceName;

  for (const line of summarySource.split(/\r?\n/)) {
    const link = line.match(
      /^(\s*)[*-]\s+\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/
    );
    if (!link) continue;
    const depth = Math.floor(link[1].replaceAll("\t", "  ").length / 2);
    const title = plainMarkdown(link[2]);
    if (depth === 0) section = title;
    summaryEntries.push({ title, section });
  }

  const locations = [...sitemapSource.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(
    (match) => decodeXml(match[1])
  );
  if (
    summaryEntries.length === 0 ||
    locations.length !== summaryEntries.length + 1
  ) {
    throw new Error(
      "Invalid GitBook index: the sitemap must contain the book root followed by every summary page."
    );
  }

  const expectedScope = new URL(options.baseUrl);
  const scopedLocations = locations.map((location) => {
    const url = new URL(location);
    if (
      url.origin !== expectedScope.origin ||
      (url.pathname !== expectedScope.pathname &&
        !url.pathname.startsWith(`${expectedScope.pathname}/`))
    ) {
      throw new Error(`GitBook URL is outside the reviewed scope: ${url.href}`);
    }
    return url.href.replace(/\/$/, "");
  });

  return uniqueRecords([
    record(options.sourceName, scopedLocations[0], options.sourceName, options),
    ...summaryEntries.map((entry, index) =>
      record(entry.title, scopedLocations[index + 1], entry.section, options)
    )
  ]);
}

export function normalizeJavascriptInfoToc(html, options) {
  const excludedPaths = new Set([
    "/about",
    "/ebook",
    "/privacy",
    "/terms",
    "/translate"
  ]);
  return requireRecords(
    uniqueRecords(
      extractHtmlLinks(html).flatMap(({ href, title }) => {
        const url = new URL(href, options.baseUrl);
        if (
          url.origin !== "https://javascript.info" ||
          !/^\/[a-z0-9][a-z0-9-]*$/.test(url.pathname) ||
          excludedPaths.has(url.pathname) ||
          url.search ||
          url.hash
        ) {
          return [];
        }
        return [record(title, url.href, options.sourceName, options)];
      })
    ),
    "javascript.info table of contents"
  );
}

export function normalizeGoByExampleToc(html, options) {
  return requireRecords(
    uniqueRecords(
      extractHtmlLinks(html).flatMap(({ href, title }) => {
        const url = new URL(href, options.baseUrl);
        if (
          url.origin !== "https://gobyexample.com" ||
          !/^\/[a-z0-9][a-z0-9-]*$/.test(url.pathname) ||
          title === "first example" ||
          url.search ||
          url.hash
        ) {
          return [];
        }
        return [record(title, url.href, "Examples", options)];
      })
    ),
    "Go by Example table of contents"
  );
}

export function normalizeAnchoredMarkdownHeadings(source, options) {
  const records = [];
  let section = options.sourceName;

  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(
      /^(#{1,6})\s+<a\s+name=["']([A-Za-z0-9._:-]+)["']><\/a>\s*(.+?)\s*$/
    );
    if (!heading) continue;
    const title = plainMarkdown(heading[3]);
    if (heading[1].length === 1) section = title;
    records.push(
      record(
        title,
        `${options.baseUrl}#${encodeURIComponent(heading[2])}`,
        section,
        options
      )
    );
  }

  return requireRecords(uniqueRecords(records), "anchored Markdown headings");
}

export function normalizeHtmlHeadings(html, options) {
  const records = [];
  let section = options.sourceName;
  visit(parse(html), (node) => {
    const heading = node.nodeName.match(/^h([1-6])$/);
    if (!heading) return;
    const id = attribute(node, "id");
    const title = textContent(node).replace(/\s+/g, " ").trim();
    if (!id || !title) return;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      throw new Error(`Unsafe heading identifier: ${id}`);
    }
    if (heading[1] === "1") section = title;
    records.push(
      record(title, `${options.baseUrl}#${encodeURIComponent(id)}`, section, options)
    );
  });
  return requireRecords(uniqueRecords(records), "HTML headings");
}

function record(title, url, section, options) {
  return {
    title: title.trim(),
    url,
    programmingLanguage: options.programmingLanguage,
    docsLocale: "en",
    sourceId: options.sourceId,
    sourceName: options.sourceName,
    sourceKind: options.sourceKind,
    section
  };
}

function plainMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<\/?(?:br|code|em|span|strong)\b[^>]*>/gi, "")
    .replace(/(?:\*\*|__|~~)/g, "")
    .replace(/[`*~]/g, "")
    .replace(/\\([\\`*_[\]{}()#+.!-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function requireRecords(records, label) {
  if (records.length === 0) throw new Error(`Invalid ${label}: no records found.`);
  return records;
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
}

function attribute(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textContent).join("");
}
