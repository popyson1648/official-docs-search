import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "smol-toml";

const root = resolve(new URL("..", import.meta.url).pathname);
const catalogPath = resolve(root, "src/data/docs-sources.toml");
const outDir = resolve(root, "public/search");
const catalog = parse(readFileSync(catalogPath, "utf8"));

const sources = catalog.languages.flatMap((language) =>
  (language.sources ?? []).map((source) => ({
    ...source,
    language: language.id
  }))
);

mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "annotations.xml"), buildAnnotations(sources));
writeFileSync(resolve(outDir, "context.xml"), buildContext(catalog.languages, sources));
writeFileSync(resolve(outDir, "scope.json"), JSON.stringify(buildScope(catalog.languages), null, 2) + "\n");

function buildAnnotations(items) {
  const body = items.flatMap((source) =>
    sourcePatterns(source).map((pattern) => {
      const labels = sourceLabels(source)
        .map((label) => `    <Label name="${escapeXml(label)}"/>`)
        .join("\n");
      return `  <Annotation about="${escapeXml(pattern)}">\n${labels}\n    <Comment>${escapeXml(source.name ?? source.id)}</Comment>\n  </Annotation>`;
    })
  );

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Annotations>\n${body.join("\n")}\n</Annotations>\n`;
}

function buildContext(languages, items) {
  const labels = [
    ...languages.map((language) => [`${language.name}`, `language_${language.id}`]),
    ["Official", "kind_official"],
    ["Conventional", "kind_conventional"],
    ["Community", "kind_community"],
    ...items.map((source) => [source.name ?? source.id, `source_${String(source.id).replaceAll("-", "_")}`])
  ];

  const facets = labels
    .map(([title, name]) => `    <Facet>\n      <FacetItem title="${escapeXml(title)}">\n        <Label name="${escapeXml(name)}" mode="FILTER"/>\n      </FacetItem>\n    </Facet>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<CustomSearchEngine top_refinements="0">\n  <Title>Official Docs Search</Title>\n  <Context>\n    <BackgroundLabels>\n      <Label name="_include_" mode="FILTER"/>\n      <Label name="_exclude_" mode="ELIMINATE"/>\n    </BackgroundLabels>\n${facets}\n  </Context>\n</CustomSearchEngine>\n`;
}

function buildScope(languages) {
  return {
    languages: languages.map((language) => ({
      id: language.id,
      name: language.name,
      sources: (language.sources ?? []).map((source) => ({
        id: source.id,
        kind: source.kind ?? "official",
        name: source.name,
        url: source.url,
        domains: source.domains ?? [],
        pathPrefixes: source.path_prefixes ?? []
      }))
    }))
  };
}

function sourcePatterns(source) {
  return (source.domains ?? []).flatMap((domain) => {
    const prefixes = source.path_prefixes?.length ? source.path_prefixes : ["/"];
    return prefixes.map((prefix) => `${domain}${normalizePrefix(prefix) || "/"}*`);
  });
}

function sourceLabels(source) {
  return [
    "_include_",
    `language_${source.language}`,
    `kind_${source.kind ?? "official"}`,
    `source_${String(source.id).replaceAll("-", "_")}`
  ];
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizePrefix(prefix) {
  if (!prefix || prefix === "/") return "";
  return String(prefix).endsWith("/") ? String(prefix) : `${prefix}/`;
}
