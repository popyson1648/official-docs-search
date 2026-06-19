import type { DocsSource } from "./sources";

export interface ProgrammableSearchConfig {
  visibleQuery: string;
  googleQuery: string;
  sites: string[];
}

export function buildProgrammableSearchConfig(query: string, sources: DocsSource[]): ProgrammableSearchConfig {
  const sites = unique(
    sources.flatMap((source) =>
      source.domains.map((domain) => {
        const prefixes = source.pathPrefixes.length > 0 ? source.pathPrefixes : ["/"];
        return prefixes.map((prefix) => `site:${domain}${normalizePrefix(prefix)}`);
      }).flat()
    )
  );

  const siteClause = sites.length > 0 ? `(${sites.join(" OR ")})` : "";

  return {
    visibleQuery: query,
    googleQuery: [query, siteClause].filter(Boolean).join(" "),
    sites
  };
}

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sourcePattern(source: DocsSource): string[] {
  return source.domains.flatMap((domain) => {
    const prefixes = source.pathPrefixes.length > 0 ? source.pathPrefixes : ["/"];
    return prefixes.map((prefix) => `${domain}${normalizePrefix(prefix) || "/"}*`);
  });
}

export function sourceLabels(source: DocsSource): string[] {
  return [
    "_include_",
    `language_${source.language}`,
    `kind_${source.kind}`,
    `source_${source.id.replaceAll("-", "_")}`
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizePrefix(prefix: string): string {
  if (!prefix || prefix === "/") return "";
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}
