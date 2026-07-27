import { plainHtmlText, uniqueRecords } from "../search-index.mjs";
import { parse } from "parse5";

export function normalizePepIndex(index, options) {
  if (!index || typeof index !== "object" || Array.isArray(index)) {
    throw new Error("Invalid PEP index.");
  }
  return uniqueRecords(
    Object.values(index).flatMap((pep) => {
      const number = Number(pep?.number);
      const title = cleanPlainText(pep?.title);
      if (!Number.isInteger(number) || number < 0 || !title) return [];
      const url = new URL(String(pep.url ?? ""));
      if (
        url.origin !== "https://peps.python.org" ||
        !/^\/pep-\d{4}\/$/.test(url.pathname)
      ) {
        return [];
      }
      const details = [
        cleanText(pep.authors),
        cleanText(pep.type),
        cleanText(pep.python_version)
      ].filter(Boolean);
      return [{
        title: `PEP ${number}: ${title}`,
        url: url.href,
        programmingLanguage: options.programmingLanguage,
        docsLocale: "en",
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceKind: "official",
        documentKind: "proposal",
        proposalStatus: cleanText(pep.status) || "unknown",
        ...(details.length > 0 ? { section: details.join(" · ") } : {})
      }];
    })
  );
}

export function normalizeTc39ProposalMarkdown(documents, options) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("Invalid TC39 proposal metadata.");
  }
  const records = [];
  for (const document of documents) {
    const definitions = new Map();
    for (const match of document.markdown.matchAll(
      /^\[([^\]]+)\]:\s*(https:\/\/\S+)\s*$/gm
    )) {
      definitions.set(match[1].toLowerCase(), match[2]);
    }
    let status = document.status;
    for (const [lineIndex, line] of document.markdown.split(/\r?\n/).entries()) {
      const heading = line.match(/^###\s+Stage\s+([0-9.]+)/i);
      if (heading) status = `stage-${heading[1]}`;
      const columns = markdownTableColumns(line);
      if (!status || columns.length < 2) continue;
      const proposalCell = columns[0];
      const title = markdownCellText(proposalCell);
      if (
        !title ||
        /^proposal$/i.test(title) ||
        /^[-:|\s]+$/.test(proposalCell)
      ) {
        continue;
      }
      const reference = proposalCell.match(/\[([^\]]+)\]\[([^\]]*)\]/);
      const inline = proposalCell.match(/\[[^\]]+\]\((https:\/\/[^)]+)\)/);
      const href = inline?.[1] ??
        (reference
          ? definitions.get((reference[2] || reference[1]).toLowerCase())
          : undefined);
      const candidateUrl = href ? new URL(href) : undefined;
      const url =
        candidateUrl?.origin === "https://github.com" &&
        candidateUrl.pathname.startsWith("/tc39/")
          ? candidateUrl
          : new URL(
              `https://github.com/tc39/proposals/blob/main/${document.path}?plain=1#L${lineIndex + 1}`
            );
      const rawInactiveReason =
        status === "inactive" ? markdownCellText(columns[2] ?? "") : undefined;
      records.push({
        title,
        url: url.href,
        programmingLanguage: options.programmingLanguage,
        docsLocale: "en",
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        sourceKind: "official",
        documentKind: "proposal",
        proposalStatus:
          rawInactiveReason
            ? `${status}: ${rawInactiveReason}`
            : status,
        section: "TC39 ECMAScript proposal"
      });
    }
  }
  return uniqueRecords(records);
}

function markdownTableColumns(line) {
  if (!line.trimStart().startsWith("|")) return [];
  const cells = line.split("|");
  return cells.slice(1, cells.at(-1)?.trim() ? undefined : -1).map((cell) => cell.trim());
}

function markdownCellText(value) {
  return plainHtmlText(
    String(value ?? "")
      .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/&nbsp;/gi, " ")
  )
    .replace(/[`*_]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeJepIndex(html, options) {
  const records = [];
  visit(parse(html), (node) => {
    if (node.nodeName !== "tr") return;
    const cells = (node.childNodes ?? []).filter((child) => child.nodeName === "td");
    if (cells.length < 8) return;
    const number = cleanPlainText(textContent(cells[6]));
    const link = findFirst(cells[7], (child) => child.nodeName === "a");
    const href = link ? attribute(link, "href") : undefined;
    const title = link ? cleanPlainText(textContent(link)) : "";
    if (!/^\d+$/.test(number) || href !== number || !title) return;
    const statusNode = findFirst(
      cells[1],
      (child) => child.nodeName === "span" && attribute(child, "title")?.startsWith("Status:")
    );
    const status =
      attribute(statusNode, "title")?.replace(/^Status:\s*/, "").trim() ||
      "unknown";
    const details = [
      attribute(
        findFirst(
          cells[0],
          (child) => child.nodeName === "span" && attribute(child, "title")?.startsWith("Type:")
        ),
        "title"
      )?.replace(/^Type:\s*/, ""),
      attribute(
        findFirst(
          cells[2],
          (child) => child.nodeName === "span" && attribute(child, "title")?.startsWith("Release:")
        ),
        "title"
      )?.replace(/^Release:\s*/, ""),
      cleanText([textContent(cells[3]), textContent(cells[5])].filter(Boolean).join("/"))
    ].map(cleanText).filter(Boolean);
    records.push({
      title:
        number.length > 4
          ? `JEP draft: ${title}`
          : `JEP ${number}: ${title}`,
      url: `https://openjdk.org/jeps/${number}`,
      programmingLanguage: options.programmingLanguage,
      docsLocale: "en",
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      sourceKind: "official",
      documentKind: "proposal",
      proposalStatus: status,
      ...(
        number.length > 4
          ? { section: [`JBS ${number}`, ...details].join(" · ") }
          : details.length > 0
            ? { section: details.join(" · ") }
            : {}
      )
    });
  });
  if (records.length === 0) throw new Error("Invalid or empty JEP index.");
  return uniqueRecords(records);
}

function findFirst(node, predicate) {
  if (!node) return undefined;
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
  return node?.attrs?.find((item) => item.name === name)?.value;
}

function textContent(node) {
  if (!node) return "";
  if (node.nodeName === "#text") return node.value ?? "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/[`*_]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPlainText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}
