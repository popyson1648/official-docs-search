import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = readJson(resolve(root, "public/search-index/manifest.json"));
const supportedEntries = manifest.entries.filter((entry) => entry.status === "supported");

for (const entry of supportedEntries) {
  const bundle = readJson(resolve(root, `public${entry.path}`));
  const query = entry.knownQueries?.[0];
  if (!query) throw new Error(`${entry.sourceId}/${entry.docsLocale} has no known query.`);
  const normalizedQuery = normalize(query);
  const record = bundle.records.find(([title, , section = ""]) =>
    normalize(`${title} ${section}`).includes(normalizedQuery)
  );
  if (!record) {
    throw new Error(`${entry.sourceId}/${entry.docsLocale} has no known result for ${query}.`);
  }

  const url = new URL(`${bundle.urlPrefix}${record[1]}`);
  if (url.protocol !== "https:" || !url.href.startsWith(bundle.urlPrefix)) {
    throw new Error(`${entry.sourceId}/${entry.docsLocale} produced an unsafe URL: ${url}`);
  }
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "official-docs-search-index-verifier/0.2" },
    signal: AbortSignal.timeout(30_000)
  });
  await response.body?.cancel();
  if (!response.ok) {
    throw new Error(`${entry.sourceId}/${entry.docsLocale} result failed: ${response.status} ${url}`);
  }
  console.log(`${entry.sourceId}/${entry.docsLocale}: ${response.status} ${url}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase();
}
