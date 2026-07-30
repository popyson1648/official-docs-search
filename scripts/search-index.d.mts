import type { SearchRecord } from "../src/core/search";

export interface IndexOptions {
  programmingLanguage: string;
  docsLocale: string;
  sourceId: string;
  sourceName: string;
  sourceKind: "official" | "conventional" | "community";
  section?: string;
  baseUrl?: string;
  buildUrl: (path: string, fragment?: string | null) => string;
  resolvePath?: (path: string, entry: Record<string, unknown>) => string;
}

export function normalizeDevdocsEntries(index: Record<string, unknown>, options: IndexOptions): SearchRecord[];
export function parseSphinxSearchIndex(source: string): Record<string, unknown>;
export function normalizeSphinxEntries(index: Record<string, unknown>, options: IndexOptions): SearchRecord[];
export function normalizeTc39Entries(html: string, options: Omit<IndexOptions, "buildUrl"> & { baseUrl: string }): SearchRecord[];
export function extractHtmlLinks(
  html: string,
  options?: { accept?: (link: { href: string; title: string; node: unknown }) => boolean }
): Array<{ href: string; title: string }>;
export function parseJavadocSearchIndex(source: string): Array<Record<string, string>>;
export function uniqueRecords(records: SearchRecord[]): SearchRecord[];
