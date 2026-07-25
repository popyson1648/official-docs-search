import {
  extractHtmlLinks,
  parseSphinxSearchIndex,
  uniqueRecords
} from "../search-index.mjs";

export function normalizeProgrammingInDToc(source, options) {
  const links = extractHtmlLinks(source);
  if (links.length === 0) throw new Error("Invalid Programming in D table of contents.");

  return uniqueRecords(
    links.flatMap(({ href, title }) => {
      const url = scopedUrl(href, options.inputUrl, options.urlPrefix);
      if (!url || !url.pathname.endsWith(".html") || url.href === options.inputUrl) {
        return [];
      }
      const clean = cleanText(title);
      if (!clean || isNavigationTitle(clean)) return [];
      return [record(clean, url.href, options, "Programming in D")];
    })
  );
}

export function normalizeCornellOcamlSearchIndex(source, options) {
  const index = parseSphinxSearchIndex(source);
  if (!Array.isArray(index.docnames) || !Array.isArray(index.titles)) {
    throw new Error("Invalid Cornell OCaml search index.");
  }

  return uniqueRecords(
    index.docnames.flatMap((docname, position) => {
      const path = String(docname ?? "");
      if (!/^chapters\/[a-z0-9_./-]+$/i.test(path) || path.includes("..")) return [];
      const title = cleanText(index.titles[position] ?? path);
      if (!title) return [];
      const url = scopedUrl(`${path}.html`, options.baseUrl, options.urlPrefix);
      return url ? [record(title, url.href, options, "OCaml textbook")] : [];
    })
  );
}

export function normalizeSolidityByExampleSearch(source, options) {
  let index;
  try {
    index = JSON.parse(source);
  } catch {
    throw new Error("Invalid Solidity by Example search index.");
  }
  if (!index || typeof index !== "object" || Array.isArray(index)) {
    throw new Error("Invalid Solidity by Example search index.");
  }

  const paths = Object.values(index).flatMap((value) =>
    Array.isArray(value) ? value : []
  );
  if (paths.length === 0) throw new Error("Invalid Solidity by Example search index.");

  return uniqueRecords(
    paths.flatMap((path) => {
      if (!/^\/[a-z0-9/-]+$/i.test(path) || path.includes("//")) return [];
      const url = scopedUrl(path, options.baseUrl, options.urlPrefix);
      if (!url) return [];
      const segments = url.pathname.split("/").filter(Boolean);
      return [
        record(
          titleFromSlug(segments.at(-1)),
          url.href,
          options,
          sectionFromPath(segments)
        )
      ];
    })
  );
}

export function normalizeCommonLispCookbookIndex(source, options) {
  const links = [
    ...source.matchAll(/\[([^\]\n]+)\]\(([^)\s]+\.html(?:#[^)\s]+)?)\)/g)
  ];
  if (links.length === 0) throw new Error("Invalid Common Lisp Cookbook index.");

  return uniqueRecords(
    links.flatMap((match) => {
      const title = cleanText(match[1]);
      const url = scopedUrl(match[2], options.baseUrl, options.urlPrefix);
      if (!title || !url) return [];
      return [record(title, url.href, options, "Common Lisp Cookbook")];
    })
  );
}

export function normalizeWebDevCourse(source, options) {
  const links = extractHtmlLinks(source);
  if (links.length === 0) throw new Error("Invalid web.dev course index.");

  return uniqueRecords(
    links.flatMap(({ href }) => {
      const url = scopedUrl(href, options.inputUrl, options.urlPrefix);
      if (!url || url.hash || url.href === options.inputUrl) return [];
      const slug = url.pathname.split("/").filter(Boolean).at(-1);
      if (!slug || slug === "quiz") return [];
      return [
        record(titleFromSlug(slug), url.href, options, options.sourceName)
      ];
    })
  );
}

export function canonicalizeWebDevCourseInput(source, options) {
  const urls = uniqueWebDevCourseUrls(source, options).sort();
  if (urls.length === 0) throw new Error("Invalid web.dev course index.");
  return urls.map((url) => `<a href="${url}">${url}</a>`).join("\n");
}

function uniqueWebDevCourseUrls(source, options) {
  return [
    ...new Set(
      extractHtmlLinks(source).flatMap(({ href }) => {
        const url = scopedUrl(href, options.inputUrl, options.urlPrefix);
        if (
          !url ||
          url.hash ||
          url.search ||
          url.href === options.inputUrl
        ) {
          return [];
        }
        const slug = url.pathname.split("/").filter(Boolean).at(-1);
        return !slug || slug === "quiz" ? [] : [url.href];
      })
    )
  ];
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
    section
  };
}

function scopedUrl(href, baseUrl, urlPrefix) {
  let url;
  try {
    url = new URL(String(href).trim(), baseUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || !url.href.startsWith(urlPrefix)) return undefined;
  return url;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+(?:\.\d+)*\.?\s+/, "")
    .trim();
}

function titleFromSlug(value) {
  return cleanText(
    decodeURIComponent(String(value ?? ""))
      .replaceAll("-", " ")
      .replaceAll("_", " ")
  ).replace(/\b\w/g, (character) => character.toUpperCase());
}

function sectionFromPath(segments) {
  if (segments[0] === "hacks") return "Security examples";
  if (segments[0] === "app") return "Application examples";
  if (segments[0] === "tests") return "Testing examples";
  return "Solidity examples";
}

function isNavigationTitle(title) {
  return /^\[.*(?:prev|next).*\]$/i.test(title);
}
