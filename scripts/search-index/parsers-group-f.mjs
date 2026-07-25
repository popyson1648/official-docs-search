import { parse } from "parse5";
import { uniqueRecords } from "../search-index.mjs";

const OBJECTIVE_C_TOC_ID = "toc-GNU-Objective-C-Features";
const COMMON_LISP_ENTRY_KINDS = [
  "standard-generic-function",
  "constant-variable",
  "condition-type",
  "special-operator",
  "system-class",
  "local-function",
  "local-macro",
  "special-form",
  "declaration",
  "accessor",
  "variable",
  "function",
  "macro",
  "symbol",
  "class",
  "type",
  "con-stant-variable",
  "func-tion"
];

export function normalizeGnuObjectiveCToc(source, options) {
  const document = parse(source);
  const marker = findNode(
    document,
    (node) =>
      node.nodeName === "a" &&
      attribute(node, "id") === OBJECTIVE_C_TOC_ID &&
      attribute(node, "href") === "Objective-C.html"
  );
  const scope = nearestParent(marker, "li");
  if (!scope) throw new Error("Invalid GNU Objective-C table of contents.");

  return uniqueRecords(
    collectNodes(scope, (node) => node.nodeName === "a").flatMap((node) => {
      const href = attribute(node, "href");
      const title = textContent(node)
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\d+(?:\.\d+)*\.?\s+/, "");
      if (!href || !title) return [];

      let url;
      try {
        url = new URL(href, options.urlPrefix);
      } catch {
        return [];
      }
      if (url.protocol !== "https:" || !url.href.startsWith(options.urlPrefix)) return [];
      return [{ title, url: url.href, section: options.section }];
    })
  );
}

export function normalizeCommonLispSitemap(source, options) {
  const locations = [...source.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)];
  if (locations.length === 0) throw new Error("Invalid Common Lisp sitemap.");

  return uniqueRecords(
    locations.flatMap((match) => {
      let url;
      try {
        url = new URL(decodeXml(match[1]));
      } catch {
        return [];
      }
      if (url.protocol !== "https:" || !url.href.startsWith(options.urlPrefix)) return [];

      const relativePath = url.pathname.slice(new URL(options.urlPrefix).pathname.length);
      if (
        !relativePath ||
        relativePath === "search" ||
        relativePath.startsWith("category/")
      ) {
        return [];
      }

      const slug = relativePath.split("/").filter(Boolean).at(-1);
      if (!slug) return [];
      const { title, section } = commonLispTitle(slug);
      return [{ title, url: url.href, ...(section ? { section } : {}) }];
    })
  );
}

function commonLispTitle(value) {
  const slug = decodeURIComponent(value).replace(/\.html$/, "");
  const entryKind = COMMON_LISP_ENTRY_KINDS.find((kind) => slug.endsWith(`_${kind}`));
  if (entryKind) {
    const names = slug.slice(0, -(entryKind.length + 1)).split("_").filter(Boolean);
    return {
      title: names.map((name) => name.toUpperCase()).join(" / "),
      section: humanize(entryKind)
    };
  }
  return { title: humanize(slug) };
}

function humanize(value) {
  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

function findNode(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes ?? []) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
}

function nearestParent(node, nodeName) {
  let current = node;
  while (current && current.nodeName !== nodeName) current = current.parentNode;
  return current;
}

function collectNodes(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  for (const child of node.childNodes ?? []) collectNodes(child, predicate, matches);
  return matches;
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value;
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
