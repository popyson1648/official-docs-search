import { parse } from "parse5";
import { uniqueRecords } from "../search-index.mjs";

export function normalizeTrustedSitemap(source, options) {
  const locations = [...source.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)];
  if (locations.length === 0) {
    throw new Error(`Invalid ${options.label} sitemap.`);
  }

  const records = uniqueRecords(
    locations.flatMap((match) => {
      const url = scopedUrl(decodeXml(match[1].trim()), options);
      if (!url || !options.acceptUrl(url)) return [];

      const title = options.titleFromUrl?.(url) ?? titleFromUrl(url);
      if (!title) return [];
      const section = options.sectionFromUrl?.(url);
      return [{ title, url: url.href, ...(section ? { section } : {}) }];
    })
  );

  if (records.length === 0) {
    throw new Error(`${options.label} sitemap has no reviewed documentation URLs.`);
  }
  return records;
}

export function normalizeTrustedRss(source, options) {
  const items = [...source.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  if (items.length === 0) throw new Error(`Invalid ${options.label} RSS feed.`);

  const records = uniqueRecords(
    items.flatMap(([, item]) => {
      const titleMatch = item.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = item.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
      const title = cleanText(decodeXml(stripCdata(titleMatch?.[1] ?? "")));
      const url = scopedUrl(
        decodeXml(stripCdata(linkMatch?.[1] ?? "").trim()),
        options
      );
      if (!title || !url || !options.acceptUrl(url)) return [];
      const section = options.sectionFromUrl?.(url);
      return [{ title, url: url.href, ...(section ? { section } : {}) }];
    })
  );

  if (records.length === 0) {
    throw new Error(`${options.label} RSS feed has no reviewed documentation URLs.`);
  }
  return records;
}

export function assertZigGuideVersion(source, expectedVersion) {
  const match = source.match(
    /theme-doc-version-badge[^>]*>\s*Version:\s*Zig\s+([^<\s]+)\s*</i
  );
  if (!match || match[1] !== expectedVersion) {
    throw new Error(
      `zig.guide version changed: expected ${expectedVersion}, found ${match?.[1] ?? "unknown"}.`
    );
  }
}

export function normalizeAdvancedRBookToc(source, options) {
  const document = parse(source);
  const toc = findNode(
    document,
    (node) => node.nodeName === "ul" && hasClass(node, "book-toc")
  );
  if (!toc) throw new Error("Invalid Advanced R book table of contents.");

  let part = "Advanced R";
  const records = [];
  for (const item of (toc.childNodes ?? []).filter((node) => node.nodeName === "li")) {
    if (hasClass(item, "book-part")) {
      part = cleanText(textContent(item)) || part;
      continue;
    }

    const anchor = findNode(item, (node) => node.nodeName === "a");
    const href = attribute(anchor, "href");
    const url = href ? scopedUrl(href, options) : undefined;
    const title = cleanText(textContent(anchor)).replace(
      /^\d+(?:\.\d+)*\.?\s+/,
      ""
    );
    if (!url || !title || !url.pathname.endsWith(".html")) continue;
    records.push({ title, url: url.href, section: part });
  }

  const unique = uniqueRecords(records);
  if (unique.length === 0) {
    throw new Error("Advanced R book table of contents has no reviewed chapters.");
  }
  return unique;
}

export function titleFromUrl(url) {
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  const raw = /^index\.html?$/i.test(last ?? "")
    ? segments.at(-2)
    : last?.replace(/\.html?$/i, "");
  if (!raw) return "";

  return humanize(decodeURIComponent(raw))
    .replace(/\bFsharp\b/gi, "F#")
    .replace(/\bOtp\b/g, "OTP")
    .replace(/\bIex\b/g, "IEx")
    .replace(/\bEts\b/g, "ETS")
    .replace(/\bRcpp\b/g, "Rcpp");
}

export function sectionFromPath(url, position) {
  const segment = url.pathname.split("/").filter(Boolean)[position];
  return segment ? humanize(decodeURIComponent(segment)) : undefined;
}

function scopedUrl(value, options) {
  let url;
  try {
    url = new URL(value, options.urlPrefix);
  } catch {
    return undefined;
  }

  const scope = new URL(options.urlPrefix);
  if (
    url.protocol !== "https:" ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  ) {
    return undefined;
  }
  url.hash = "";
  url.search = "";
  return url;
}

function humanize(value) {
  const words = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findNode(node, predicate) {
  if (!node) return undefined;
  if (predicate(node)) return node;
  for (const child of node.childNodes ?? []) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
}

function hasClass(node, name) {
  return String(attribute(node, "class") ?? "")
    .split(/\s+/)
    .includes(name);
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value;
}

function textContent(node) {
  if (!node) return "";
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripCdata(value) {
  return String(value).replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1");
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}
