import { parse } from "parse5";

export function normalizeDevdocsEntries(index, options) {
  return uniqueRecords(
    (index.entries ?? []).map((entry) => ({
      title: String(entry.name ?? "").trim(),
      url: options.buildUrl(String(entry.path ?? "")),
      programmingLanguage: options.programmingLanguage,
      docsLocale: options.docsLocale,
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      sourceKind: options.sourceKind,
      section: String(entry.type ?? "").trim() || undefined
    }))
  );
}

export function parseSphinxSearchIndex(source) {
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid Sphinx search index.");
  const searchIndex = JSON.parse(source.slice(start, end + 1));
  if (!searchIndex || typeof searchIndex !== "object") {
    throw new Error("Invalid Sphinx search index.");
  }
  return searchIndex;
}

export function normalizeSphinxEntries(index, options) {
  const records = [];
  for (let position = 0; position < (index.docnames ?? []).length; position += 1) {
    records.push({
      title: index.titles?.[position] ?? index.docnames[position],
      url: options.buildUrl(index.docnames[position]),
      programmingLanguage: options.programmingLanguage,
      docsLocale: options.docsLocale,
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      sourceKind: options.sourceKind,
      section: options.section
    });
  }

  for (const [title, locations] of Object.entries(index.alltitles ?? {})) {
    for (const location of locations) {
      const [position, fragment] = location;
      const docname = index.docnames?.[position];
      if (!docname) continue;
      records.push({
        title,
        url: options.buildUrl(docname, fragment),
        programmingLanguage: options.programmingLanguage,
        docsLocale: options.docsLocale,
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceKind: options.sourceKind,
        section: index.titles?.[position] ?? options.section
      });
    }
  }
  return uniqueRecords(records);
}

export function normalizeTc39Entries(html, options) {
  const document = parse(html);
  const records = [];
  visit(document, (node) => {
    if (!new Set(["emu-intro", "emu-clause", "emu-annex"]).has(node.nodeName)) return;
    const id = attribute(node, "id");
    const heading = (node.childNodes ?? []).find((child) => /^h[1-6]$/.test(child.nodeName));
    const title = heading ? textContent(heading).replace(/\s+/g, " ").trim() : "";
    if (!id || !title) return;
    records.push({
      title,
      url: `${options.baseUrl}#${encodeURIComponent(id)}`,
      programmingLanguage: options.programmingLanguage,
      docsLocale: options.docsLocale,
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      sourceKind: options.sourceKind,
      section: options.section
    });
  });
  return uniqueRecords(records);
}

export function extractHtmlLinks(html, options = {}) {
  const document = parse(html);
  const links = [];
  visit(document, (node) => {
    if (node.nodeName !== "a") return;
    const href = attribute(node, "href");
    const title = textContent(node).replace(/\s+/g, " ").trim();
    if (!href || !title || (options.accept && !options.accept({ href, title, node }))) return;
    links.push({ href, title });
  });
  return links;
}

export function parseJavadocSearchIndex(source) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("Invalid Javadoc search index.");
  const value = JSON.parse(source.slice(start, end + 1));
  if (!Array.isArray(value)) throw new Error("Invalid Javadoc search index.");
  return value;
}

export function uniqueRecords(records) {
  const seen = new Set();
  return records.filter((record) => {
    if (!record.title || !record.url || seen.has(record.url)) return false;
    seen.add(record.url);
    return true;
  });
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
