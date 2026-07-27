import { parse } from "parse5";
import { uniqueRecords } from "../search-index.mjs";

const PAPER_PREFIX =
  "https://www.open-std.org/jtc1/sc22/wg21/docs/papers/";

export function extractWg21YearUrls(html, rootUrl = PAPER_PREFIX) {
  const years = new Set();
  visit(parse(html), (node) => {
    if (node.nodeName !== "a") return;
    const href = attribute(node, "href");
    if (!href) return;
    const url = new URL(href, rootUrl);
    if (
      url.origin === "https://www.open-std.org" &&
      /^\/jtc1\/sc22\/wg21\/docs\/papers\/\d{4}\/$/.test(url.pathname)
    ) {
      url.hash = "";
      url.search = "";
      years.add(url.href);
    }
  });
  if (years.size === 0) throw new Error("WG21 paper archive has no year indexes.");
  return [...years].sort();
}

export function normalizeWg21PaperTables(pages, options) {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error("Invalid WG21 paper tables.");
  }
  const byIdentifier = new Map();

  for (const { html, url: pageUrl } of pages) {
    visit(parse(html), (node) => {
      if (node.nodeName !== "tr") return;
      const cells = (node.childNodes ?? []).filter((child) => child.nodeName === "td");
      if (cells.length < 8) return;
      const identifier = cleanText(textContent(cells[0])).toUpperCase();
      if (!/^P\d{4}R\d+$/.test(identifier)) return;
      const anchor = findFirst(cells[0], (child) => child.nodeName === "a");
      const href = anchor ? attribute(anchor, "href") : undefined;
      if (!href) return;
      const url = new URL(href, pageUrl);
      if (
        url.origin !== "https://www.open-std.org" ||
        !url.href.startsWith(PAPER_PREFIX)
      ) {
        return;
      }
      const title = cleanText(textContent(cells[1]));
      if (!title) return;
      const disposition = cleanText(textContent(cells[7]));
      const record = {
        identifier,
        revision: Number(identifier.match(/R(\d+)$/)?.[1] ?? 0),
        title,
        url: url.href,
        author: cleanText(textContent(cells[2])),
        date: cleanText(textContent(cells[3])),
        subgroup: cleanText(textContent(cells[6])),
        status: disposition || (/withdrawn/i.test(title) ? "withdrawn" : ""),
        pageUrl
      };
      const previous = byIdentifier.get(identifier);
      if (
        !previous ||
        pageUrl > previous.pageUrl ||
        (pageUrl === previous.pageUrl && record.date > previous.date)
      ) {
        byIdentifier.set(identifier, record);
      }
    });
  }

  const maximumRevision = new Map();
  for (const record of byIdentifier.values()) {
    const series = record.identifier.replace(/R\d+$/, "");
    maximumRevision.set(
      series,
      Math.max(maximumRevision.get(series) ?? -1, record.revision)
    );
  }

  return uniqueRecords(
    [...byIdentifier.values()]
      .sort((left, right) => left.identifier.localeCompare(right.identifier))
      .map((record) => {
        const series = record.identifier.replace(/R\d+$/, "");
        const proposalStatus =
          record.status ||
          (record.revision < (maximumRevision.get(series) ?? record.revision)
            ? "superseded"
            : "unknown");
        const details = [record.author, record.date, record.subgroup].filter(Boolean);
        return {
          title: `${record.identifier}: ${record.title}`,
          url: record.url,
          programmingLanguage: options.programmingLanguage,
          docsLocale: options.docsLocale,
          sourceId: options.sourceId,
          sourceName: options.sourceName,
          sourceKind: options.sourceKind,
          documentKind: "proposal",
          proposalStatus,
          ...(details.length > 0 ? { section: details.join(" · ") } : {})
        };
      })
  );
}

function findFirst(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes ?? []) {
    const found = findFirst(child, predicate);
    if (found) return found;
  }
  return undefined;
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

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}
