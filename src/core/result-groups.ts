import type { RankedSearchRecord } from "./search";
import type { ResultSortOrder } from "./result-filters";

export interface SearchResultGroup {
  title: string;
  programmingLanguage: string;
  records: RankedSearchRecord[];
}

/**
 * Groups only reference records that expose an unambiguous technical title.
 *
 * Ranking order is preserved: the first record creates the group and remains
 * its primary origin. A second record from the same source and locale stays
 * separate because equal titles do not prove that two pages are equivalent.
 */
export function groupSearchResults(
  records: readonly RankedSearchRecord[]
): SearchResultGroup[] {
  const groups: SearchResultGroup[] = [];
  const mergeTargets = new Map<string, SearchResultGroup>();

  for (const record of records) {
    const key = referenceGroupKey(record);
    const target = key ? mergeTargets.get(key) : undefined;
    if (target && !target.records.some((candidate) => sameOrigin(candidate, record))) {
      target.records.push(record);
      continue;
    }

    const group: SearchResultGroup = {
      title: record.title,
      programmingLanguage: record.programmingLanguage,
      records: [record]
    };
    groups.push(group);
    if (key && !mergeTargets.has(key)) mergeTargets.set(key, group);
  }

  return groups;
}

/**
 * Orders result groups by catalog language name without disturbing relevance
 * order inside the same language.
 */
export function orderSearchResultGroups(
  groups: readonly SearchResultGroup[],
  languageNames: ReadonlyMap<string, string>,
  order: ResultSortOrder
): SearchResultGroup[] {
  if (order === "relevance") return [...groups];

  const direction = order === "language-desc" ? -1 : 1;
  const collator = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base"
  });
  return groups
    .map((group, relevanceIndex) => ({ group, relevanceIndex }))
    .sort((left, right) => {
      const leftName =
        languageNames.get(left.group.programmingLanguage) ??
        left.group.programmingLanguage;
      const rightName =
        languageNames.get(right.group.programmingLanguage) ??
        right.group.programmingLanguage;
      const languageOrder = collator.compare(leftName, rightName) * direction;
      return languageOrder || left.relevanceIndex - right.relevanceIndex;
    })
    .map(({ group }) => group);
}

function referenceGroupKey(record: RankedSearchRecord): string | undefined {
  if ((record.documentKind ?? "reference") !== "reference") return undefined;
  const title = record.title.trim();
  if (!looksLikeQualifiedSymbol(title)) return undefined;
  const canonicalTitle = title
    .replace(/\(\s*\)$/u, "")
    .replace(/\s*(::|[.#])\s*/gu, "$1")
    .replace(/\s+/gu, " ");
  return `${record.programmingLanguage}\u0000${canonicalTitle}`;
}

function looksLikeQualifiedSymbol(title: string): boolean {
  return (
    title.includes("::") ||
    /[\p{L}\p{N}_$][.#][\p{L}\p{N}_$]/u.test(title) ||
    /[\p{L}\p{N}_$]\s*\(\s*\)\s*$/u.test(title)
  );
}

function sameOrigin(
  left: RankedSearchRecord,
  right: RankedSearchRecord
): boolean {
  return left.sourceId === right.sourceId && left.docsLocale === right.docsLocale;
}
