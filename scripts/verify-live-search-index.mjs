import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { fetchDocumentationUrl } from "./search-index/http-fetch.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await run(process.argv.slice(2));
}

async function run(rawArgs) {
  const manifest = readJson(resolve(root, "public/search-index/manifest.json"));
  const entries = selectManifestEntries(manifest.entries, rawArgs);
  const results = await verifyLiveEntries(entries);
  for (const result of results) {
    if (result.message) console.log(result.message);
  }
  const errors = results.flatMap((result) =>
    result.error ? [result.error] : []
  );
  if (errors.length > 0) {
    throw new Error(`Live result verification failed:\n${errors.join("\n")}`);
  }
  console.log(`Verified ${entries.length} live result URLs.`);
}

export async function verifyLiveEntries(
  entries,
  {
    fetcher = fetchWithRetry,
    bundleReader = (entry) =>
      readJson(resolve(root, `public${entry.path}`))
  } = {}
) {
  return await mapConcurrent(entries, 6, async (entry) => {
    try {
      return {
        message: await verifyEntry(entry, { fetcher, bundleReader })
      };
    } catch (error) {
      return {
        error: `${entry.sourceId}/${entry.docsLocale}: ${
          error instanceof Error ? error.message : String(error)
        }`
      };
    }
  });
}

async function verifyEntry(entry, { fetcher, bundleReader }) {
  const bundle = bundleReader(entry);
  const query = entry.knownQueries?.[0];
  if (!query) throw new Error("No known query.");
  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const record =
    bundle.records.find(([title]) => normalize(title) === normalizedQuery) ??
    bundle.records.find(([title, , section = ""]) => {
      const haystack = normalize(`${title} ${section}`);
      return queryTokens.every((token) => haystack.includes(token));
    });
  if (!record) throw new Error(`No known result for ${query}.`);

  const url = new URL(`${bundle.urlPrefix}${record[1]}`);
  if (url.protocol !== "https:" || !url.href.startsWith(bundle.urlPrefix)) {
    throw new Error(`Unsafe URL: ${url}`);
  }
  const response = await fetcher(url);
  await response.body?.cancel();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return `${entry.sourceId}/${entry.docsLocale}: ${response.status} ${url}`;
}

export function selectManifestEntries(entries, rawArgs) {
  const supported = entries.filter((entry) => entry.status === "supported");
  const sourceSelectors = optionValues(rawArgs, "--source");
  const excludedSourceSelectors = optionValues(rawArgs, "--exclude-source");
  const frequencies = optionValues(rawArgs, "--frequency");
  for (const frequency of frequencies) {
    if (frequency !== "weekly" && frequency !== "monthly") {
      throw new Error(`Unsupported update frequency: ${frequency}`);
    }
  }
  const valueIndexes = new Set();
  for (let index = 0; index < rawArgs.length; index += 1) {
    if (
      ["--source", "--exclude-source", "--frequency"].includes(rawArgs[index])
    ) {
      valueIndexes.add(index + 1);
    }
  }
  rawArgs.forEach((argument, index) => {
    if (
      valueIndexes.has(index) ||
      ["--source", "--exclude-source", "--frequency"].includes(argument) ||
      argument.startsWith("--source=") ||
      argument.startsWith("--exclude-source=") ||
      argument.startsWith("--frequency=")
    ) {
      return;
    }
    throw new Error(`Unknown argument: ${argument}`);
  });
  const matchesSelector = (entry, selector) =>
    selector.includes("/")
      ? `${entry.sourceId}/${entry.docsLocale}` === selector
      : entry.sourceId === selector;
  for (const selector of [
    ...sourceSelectors,
    ...excludedSourceSelectors
  ]) {
    if (!supported.some((entry) => matchesSelector(entry, selector))) {
      throw new Error(`Unknown source selector: ${selector}`);
    }
  }
  const selected = supported.filter(
    (entry) =>
      (sourceSelectors.length === 0 ||
        sourceSelectors.some((selector) =>
          matchesSelector(entry, selector)
        )) &&
      (frequencies.length === 0 ||
        frequencies.includes(entry.updateFrequency)) &&
      !excludedSourceSelectors.some((selector) =>
        matchesSelector(entry, selector)
      )
  );
  if (selected.length === 0) {
    throw new Error("The requested source selection is empty.");
  }
  return selected;
}

function optionValues(args, option) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === option) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${option} requires a value.`);
      }
      values.push(value);
      index += 1;
    } else if (argument.startsWith(`${option}=`)) {
      const value = argument.slice(option.length + 1);
      if (!value) throw new Error(`${option} requires a value.`);
      values.push(value);
    }
  }
  return values;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    Array.from(
      { length: Math.min(concurrency, values.length) },
      async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await callback(values[index], index);
      }
      }
    )
  );
  return results;
}
