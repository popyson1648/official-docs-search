import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { fetchDocumentationUrl } from "./search-index/http-fetch.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = readJson(resolve(root, "public/search-index/manifest.json"));
const supportedEntries = manifest.entries.filter((entry) => entry.status === "supported");

const results = await mapConcurrent(supportedEntries, 6, async (entry) => {
  try {
    return { message: await verifyEntry(entry) };
  } catch (error) {
    return {
      error: `${entry.sourceId}/${entry.docsLocale}: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  }
});
for (const result of results) {
  if (result.message) console.log(result.message);
}
const errors = results.flatMap((result) => (result.error ? [result.error] : []));
if (errors.length > 0) {
  throw new Error(`Live result verification failed:\n${errors.join("\n")}`);
}

async function verifyEntry(entry) {
  const bundle = readJson(resolve(root, `public${entry.path}`));
  const query = entry.knownQueries?.[0];
  if (!query) throw new Error("No known query.");
  const normalizedQuery = normalize(query);
  const record = bundle.records.find(([title, , section = ""]) =>
    normalize(`${title} ${section}`).includes(normalizedQuery)
  );
  if (!record) throw new Error(`No known result for ${query}.`);

  const url = new URL(`${bundle.urlPrefix}${record[1]}`);
  if (url.protocol !== "https:" || !url.href.startsWith(bundle.urlPrefix)) {
    throw new Error(`Unsafe URL: ${url}`);
  }
  const response = await fetchWithRetry(url);
  await response.body?.cancel();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return `${entry.sourceId}/${entry.docsLocale}: ${response.status} ${url}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase();
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const usesSlowConnect =
        new URL(url).hostname === "gcc.gnu.org" ||
        new URL(url).hostname === "www.gnu.org";
      const response = await fetchDocumentationUrl(url, {
        redirect: "follow",
        headers: { "User-Agent": "official-docs-search-index-verifier/0.3" },
        ...(!usesSlowConnect ? { signal: AbortSignal.timeout(30_000) } : {})
      });
      if (response.ok || attempt === 3) return response;
      lastError = new Error(`HTTP ${response.status}`);
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
  }
  throw lastError;
}

async function mapConcurrent(values, concurrency, callback) {
  const results = new Array(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await callback(values[index], index);
      }
    })
  );
  return results;
}
