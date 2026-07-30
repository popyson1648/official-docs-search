import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { load as parseYaml } from "js-yaml";
import {
  buildSearchIndexArtifacts,
  publishSearchIndexArtifacts,
  readPreviousManifest
} from "./search-index-generator.mjs";
import {
  extractHtmlLinks,
  normalizeSphinxEntries,
  normalizeTc39Entries,
  parseJavadocSearchIndex,
  parseSphinxSearchIndex,
  uniqueRecords
} from "./search-index.mjs";
import {
  devdocsJob,
  documentationUrl,
  linkRecords,
  restoreRustdocPathCase
} from "./search-index/job-helpers.mjs";
import { multilingualGroupBJobs } from "./search-index/jobs/multilingual-group-b.mjs";
import { microsoftGroupCJobs } from "./search-index/jobs/microsoft-group-c.mjs";
import { englishGroupAJobs } from "./search-index/jobs/english-group-a.mjs";
import { remainingGroupDJobs } from "./search-index/jobs/remaining-group-d.mjs";
import { japaneseGroupEJobs } from "./search-index/jobs/japanese-group-e.mjs";
import { replacementGroupFJobs } from "./search-index/jobs/replacements-group-f.mjs";
import { gnuJobs } from "./search-index/jobs/gnu.mjs";
import { trustedCommunityGroupAJobs } from "./search-index/jobs/trusted-community-group-a.mjs";
import { trustedCommunityGroupBJobs } from "./search-index/jobs/trusted-community-group-b.mjs";
import { trustedCommunityGroupCJobs } from "./search-index/jobs/trusted-community-group-c.mjs";
import { standardsGroupJobs } from "./search-index/jobs/standards-group.mjs";
import { proposalsGroupJobs } from "./search-index/jobs/proposals-group.mjs";
import { fetchDocumentationUrl } from "./search-index/http-fetch.mjs";
import { qualifySearchRecordTitles } from "./search-index/title-qualification.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
/* Identify the indexer and a reachable contact so upstream operators can see
   who is fetching their published indexes and how to reach the operator. */
const INDEXER_USER_AGENT =
  "langref-search-indexer/0.4 (+https://langrefsearch.com/)";
const outputDirectory = resolve(root, "public/search-index");
const catalogSource = readFileSync(resolve(root, "src/data/docs-sources.toml"), "utf8");

const rawSearchIndexJobs = [
  ...standardsGroupJobs,
  ...proposalsGroupJobs,
  ...trustedCommunityGroupAJobs,
  ...trustedCommunityGroupBJobs,
  ...trustedCommunityGroupCJobs,
  devdocsJob({
    sourceId: "python-docs",
    programmingLanguage: "python",
    docsLocale: "en",
    sourceKind: "official",
    sourceName: "Python Documentation",
    inputUrl: "https://documents.devdocs.io/python~3.14/index.json",
    upstreamVersion: "Python 3.14 via DevDocs",
    urlPrefix: "https://docs.python.org/3.14/",
    buildUrl: (path) => documentationUrl("https://docs.python.org/3.14/", path),
    minimumRecords: 10_000,
    knownQueries: ["list", "pathlib"],
    attribution: "Python documentation © Python Software Foundation; PSF License.",
    licenseUrl: "https://docs.python.org/3/license.html"
  }),
  {
    sourceId: "python-docs",
    programmingLanguage: "python",
    docsLocale: "ja",
    adapter: "sphinx",
    upstreamVersion: "Python 3 Japanese latest",
    urlPrefix: "https://docs.python.org/ja/3/",
    minimumRecords: 5_000,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["リスト", "pathlib"],
    attribution: "Python documentation © Python Software Foundation; PSF License.",
    licenseUrl: "https://docs.python.org/ja/3/license.html",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const source = await fetchText("https://docs.python.org/ja/3/searchindex.js");
      return normalizeSphinxEntries(parseSphinxSearchIndex(source), {
        sourceId: "python-docs",
        programmingLanguage: "python",
        docsLocale: "ja",
        sourceKind: "official",
        sourceName: "Python Documentation",
        buildUrl: (path, fragment) =>
          `https://docs.python.org/ja/3/${path}.html${fragment ? `#${encodeURIComponent(fragment)}` : ""}`
      });
    }
  },
  devdocsJob({
    sourceId: "rust-docs",
    programmingLanguage: "rust",
    docsLocale: "en",
    sourceKind: "official",
    sourceName: "Rust Documentation",
    inputUrl: "https://documents.devdocs.io/rust/index.json",
    upstreamVersion: "Rust latest via DevDocs",
    urlPrefix: "https://doc.rust-lang.org/",
    buildUrl: (path) => documentationUrl("https://doc.rust-lang.org/", path),
    resolvePath: restoreRustdocPathCase,
    minimumRecords: 30_000,
    knownQueries: ["TcpListener", "IntoIterator"],
    attribution: "Rust documentation © The Rust Project Developers; Apache-2.0 or MIT.",
    licenseUrl: "https://www.rust-lang.org/policies/licenses"
  }),
  {
    sourceId: "tc39-ecma262",
    programmingLanguage: "javascript",
    docsLocale: "en",
    adapter: "ecmarkup",
    upstreamVersion: "ECMA-262 latest",
    urlPrefix: "https://tc39.es/ecma262/",
    minimumRecords: 2_000,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["array", "promise"],
    attribution: "ECMAScript specification © Ecma International.",
    licenseUrl: "https://tc39.es/ecma262/",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeTc39Entries(await fetchText("https://tc39.es/ecma262/"), {
        sourceId: "tc39-ecma262",
        programmingLanguage: "javascript",
        docsLocale: "en",
        sourceKind: "official",
        sourceName: "ECMAScript Specification",
        baseUrl: "https://tc39.es/ecma262/",
        section: "ECMAScript specification"
      })
  },
  devdocsJob({
    sourceId: "mdn-js",
    programmingLanguage: "javascript",
    docsLocale: "en",
    sourceKind: "conventional",
    sourceName: "MDN Web Docs",
    inputUrl: "https://documents.devdocs.io/javascript/index.json",
    upstreamVersion: "MDN JavaScript latest via DevDocs",
    urlPrefix: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/",
    buildUrl: (path) => `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/${path}`,
    minimumRecords: 1_000,
    knownQueries: ["proxy", "promise"],
    attribution: "MDN content © Mozilla contributors; CC BY-SA 2.5 or later.",
    licenseUrl: "https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license"
  }),
  devdocsJob({
    sourceId: "typescript-docs",
    programmingLanguage: "typescript",
    docsLocale: "en",
    sourceKind: "official",
    sourceName: "TypeScript Documentation",
    inputUrl: "https://documents.devdocs.io/typescript/index.json",
    upstreamVersion: "TypeScript 6.0.3 via DevDocs",
    urlPrefix: "https://www.typescriptlang.org/docs/",
    buildUrl: (path) => new URL(path, "https://www.typescriptlang.org/").href,
    acceptRecord: (record) => record.url.startsWith("https://www.typescriptlang.org/docs/"),
    minimumRecords: 170,
    knownQueries: ["generics", "narrowing"],
    attribution:
      "TypeScript documentation © Microsoft, CC BY 4.0. Index metadata adapted from DevDocs.",
    licenseUrl: "https://github.com/microsoft/TypeScript-Website/blob/v2/LICENSE"
  }),
  devdocsJob({
    sourceId: "go-std",
    programmingLanguage: "go",
    docsLocale: "en",
    sourceKind: "official",
    sourceName: "Go Standard Library",
    inputUrl: "https://documents.devdocs.io/go/index.json",
    upstreamVersion: "Go 1.26.0 via DevDocs",
    urlPrefix: "https://pkg.go.dev/",
    buildUrl: (path) => goDocumentationUrl(path, "go1.26.0"),
    minimumRecords: 6_000,
    knownQueries: ["Reader", "Checksum"],
    attribution:
      "Go documentation © The Go Authors; BSD-3-Clause. Index metadata adapted from DevDocs.",
    licenseUrl: "https://go.googlesource.com/go/+/master/LICENSE",
    updateFrequency: "monthly"
  }),
  {
    sourceId: "java-docs",
    programmingLanguage: "java",
    docsLocale: "en",
    adapter: "javadoc-types",
    upstreamVersion: "Java SE 25",
    urlPrefix: "https://docs.oracle.com/en/java/javase/25/docs/api/",
    minimumRecords: 5_000,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["String", "List"],
    attribution:
      "Java SE 25 & JDK 25 API documentation © Oracle and/or its affiliates. All rights reserved.",
    licenseUrl: "https://docs.oracle.com/en/java/javase/25/docs/legal/copyright.html",
    updateFrequency: "monthly",
    load: async ({ fetchText }) => {
      const baseUrl = "https://docs.oracle.com/en/java/javase/25/docs/api/";
      const packages = parseJavadocSearchIndex(
        await fetchText(`${baseUrl}package-search-index.js`)
      );
      const types = parseJavadocSearchIndex(await fetchText(`${baseUrl}type-search-index.js`));
      const modules = new Map(
        packages
          .filter((entry) => entry.m && entry.l)
          .map((entry) => [entry.l, entry.m])
      );
      return uniqueRecords([
        ...packages.flatMap((entry) => {
          if (!entry.m || !entry.l) return [];
          return [
            {
              title: entry.l,
              url: `${baseUrl}${entry.m}/${entry.l.replaceAll(".", "/")}/package-summary.html`,
              section: entry.m
            }
          ];
        }),
        ...types.flatMap((entry) => {
          const moduleName = modules.get(entry.p);
          if (!moduleName || !entry.p || !entry.l) return [];
          return [
            {
              title: entry.l,
              url: `${baseUrl}${moduleName}/${entry.p.replaceAll(".", "/")}/${entry.l}.html`,
              section: entry.p
            }
          ];
        })
      ]);
    }
  },
  {
    sourceId: "csharp-docs",
    programmingLanguage: "csharp",
    docsLocale: "en",
    adapter: "yaml-toc",
    upstreamVersion: "dotnet/docs b2bd326ace411a28756f9f2e93e21ff289840a56",
    urlPrefix: "https://learn.microsoft.com/en-us/dotnet/csharp/",
    minimumRecords: 250,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["Generics", "Pattern matching"],
    attribution: ".NET and C# documentation © Microsoft, CC BY 4.0.",
    licenseUrl: "https://github.com/dotnet/docs/blob/main/LICENSE",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const inputUrl =
        "https://raw.githubusercontent.com/dotnet/docs/b2bd326ace411a28756f9f2e93e21ff289840a56/docs/csharp/toc.yml";
      const toc = parseYaml(await fetchText(inputUrl));
      return uniqueRecords(csharpTocRecords(toc));
    }
  },
  ...["en", "ja"].map((docsLocale) => ({
    sourceId: "php-manual",
    programmingLanguage: "php",
    docsLocale,
    adapter: "php-manual-index",
    upstreamVersion: "PHP Manual rolling",
    urlPrefix: `https://www.php.net/manual/${docsLocale}/`,
    minimumRecords: 9_000,
    maximumRecordDropRatio: 0.1,
    maximumSizeChangeRatio: 0.3,
    knownQueries: ["array_map"],
    attribution: "PHP Manual © PHP Documentation Group, CC BY 3.0 or later.",
    licenseUrl: `https://www.php.net/manual/${docsLocale}/copyright.php`,
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const inputUrl = `https://www.php.net/manual/${docsLocale}/indexes.functions.php`;
      const links = extractHtmlLinks(await fetchText(inputUrl), {
        accept: ({ href }) => /^[a-z0-9_.-]+\.php(?:#.*)?$/i.test(href)
      });
      return linkRecords(links, inputUrl);
    }
  })),
  {
    sourceId: "ruby-docs",
    programmingLanguage: "ruby",
    docsLocale: "en",
    adapter: "rdoc-toc",
    upstreamVersion: "Ruby 3.4",
    urlPrefix: "https://docs.ruby-lang.org/en/3.4/",
    minimumRecords: 16_000,
    maximumRecordDropRatio: 0.1,
    maximumSizeChangeRatio: 0.3,
    knownQueries: ["Enumerable", "map"],
    attribution:
      "Ruby documentation © Ruby contributors; Ruby License and component-specific licenses.",
    licenseUrl: "https://docs.ruby-lang.org/en/3.4/LEGAL.html",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const inputUrl = "https://docs.ruby-lang.org/en/3.4/table_of_contents.html";
      return linkRecords(
        extractHtmlLinks(await fetchText(inputUrl), {
          accept: ({ href }) => !/^(?:https?:|mailto:|#)/i.test(href)
        }),
        inputUrl,
        "https://docs.ruby-lang.org/en/3.4/"
      );
    }
  },
  {
    sourceId: "ruby-docs",
    programmingLanguage: "ruby",
    docsLocale: "ja",
    adapter: "ruby-reference-index",
    upstreamVersion: "Ruby 3.4 Japanese Reference",
    urlPrefix: "https://docs.ruby-lang.org/ja/3.4/",
    minimumRecords: 11_500,
    maximumRecordDropRatio: 0.1,
    maximumSizeChangeRatio: 0.3,
    knownQueries: ["Enumerable", "オブジェクト"],
    attribution: "Ruby Reference Manual Japanese edition, CC BY 3.0.",
    licenseUrl: "https://docs.ruby-lang.org/ja/latest/doc/license.html",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const inputUrls = ["class/index.html", "function/index.html", "library/index.html", "doc/index.html"].map(
        (path) => `https://docs.ruby-lang.org/ja/3.4/${path}`
      );
      const records = [];
      for (const inputUrl of inputUrls) {
        records.push(
          ...linkRecords(
            extractHtmlLinks(await fetchText(inputUrl), {
              accept: ({ href }) => !/^(?:https?:|mailto:|#)/i.test(href)
            }),
            inputUrl,
            "https://docs.ruby-lang.org/ja/3.4/"
          )
        );
      }
      return uniqueRecords(records);
    }
  },
  ...multilingualGroupBJobs,
  ...microsoftGroupCJobs,
  ...englishGroupAJobs,
  ...remainingGroupDJobs,
  ...japaneseGroupEJobs,
  ...replacementGroupFJobs,
  ...gnuJobs
];

export const searchIndexJobs = rawSearchIndexJobs.map((job) => ({
  ...job,
  load: async (context) =>
    qualifySearchRecordTitles(await job.load(context), job)
}));

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await run(process.argv.slice(2));
}

async function run(rawArgs) {
  const parsed = parseSearchIndexArguments(rawArgs);
  const previousManifest = readPreviousManifest(outputDirectory);
  const selectedKeys = selectSearchIndexJobKeys(searchIndexJobs, parsed);
  const { files, manifest } = await buildSearchIndexArtifacts({
    catalogSource,
    jobs: searchIndexJobs,
    fetcher: fetchWithRetry,
    previousManifest,
    ...(selectedKeys
      ? {
          selectedKeys,
          readPreviousArtifact: (filename) =>
            readFileSync(resolve(outputDirectory, filename), "utf8")
        }
      : {}),
    acceptLargeChanges: parsed.acceptLargeChanges
  });
  publishSearchIndexArtifacts({
    files,
    outputDirectory,
    mode: parsed.mode
  });

  for (const entry of manifest.entries) {
    const key = `${entry.sourceId}/${entry.docsLocale}`;
    if (
      entry.status === "supported" &&
      (!selectedKeys || selectedKeys.includes(key))
    ) {
      console.log(
        `${key}: ${entry.recordCount} records → ${entry.path}`
      );
    }
  }
  const scope = selectedKeys
    ? `${selectedKeys.length} selected indexes`
    : "all indexes";
  console.log(
    parsed.mode === "update"
      ? `Search indexes updated (${scope}).`
      : `Search indexes are synchronized (${scope}).`
  );
}

export function parseSearchIndexArguments(rawArgs) {
  const modes = rawArgs.filter(
    (argument) => argument === "--update" || argument === "--check"
  );
  if (modes.length !== 1) {
    throw new Error("Use exactly one of --update or --check.");
  }
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
  const knownFlags = new Set([
    "--update",
    "--check",
    "--accept-large-changes",
    "--source",
    "--exclude-source",
    "--frequency"
  ]);
  rawArgs.forEach((argument, index) => {
    if (
      valueIndexes.has(index) ||
      knownFlags.has(argument) ||
      argument.startsWith("--source=") ||
      argument.startsWith("--exclude-source=") ||
      argument.startsWith("--frequency=")
    ) {
      return;
    }
    throw new Error(`Unknown argument: ${argument}`);
  });
  return {
    mode: modes[0].slice(2),
    sourceSelectors,
    excludedSourceSelectors,
    frequencies,
    acceptLargeChanges: rawArgs.includes("--accept-large-changes")
  };
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

export function selectSearchIndexJobKeys(jobs, parsed) {
  if (
    parsed.sourceSelectors.length === 0 &&
    parsed.excludedSourceSelectors.length === 0 &&
    parsed.frequencies.length === 0
  ) {
    return undefined;
  }
  const matchesSelector = (job, selector) =>
    selector.includes("/")
      ? `${job.sourceId}/${job.docsLocale}` === selector
      : job.sourceId === selector;
  for (const selector of [
    ...parsed.sourceSelectors,
    ...parsed.excludedSourceSelectors
  ]) {
    if (!jobs.some((job) => matchesSelector(job, selector))) {
      throw new Error(`Unknown source selector: ${selector}`);
    }
  }
  const selected = jobs.filter(
    (job) =>
      (parsed.sourceSelectors.length === 0 ||
        parsed.sourceSelectors.some((selector) =>
          matchesSelector(job, selector)
        )) &&
      (parsed.frequencies.length === 0 ||
        parsed.frequencies.includes(job.updateFrequency)) &&
      !parsed.excludedSourceSelectors.some((selector) =>
        matchesSelector(job, selector)
      )
  );
  if (selected.length === 0) {
    throw new Error("The requested source selection is empty.");
  }
  return selected.map((job) => `${job.sourceId}/${job.docsLocale}`);
}

function goDocumentationUrl(path, version) {
  const [pathname, fragment] = path.split("#", 2);
  const packagePath = pathname.replace(/\/index$/, "");
  return `https://pkg.go.dev/${packagePath}@${version}${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
}

function csharpTocRecords(value, section = "C# documentation") {
  if (!value || typeof value !== "object") return [];
  const records = [];
  const items = Array.isArray(value) ? value : Array.isArray(value.items) ? value.items : [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const title = String(item.name ?? "").trim();
    const href = String(item.href ?? "");
    if (title && href.endsWith(".md") && !href.startsWith("../")) {
      const route = href.replace(/\.md$/, "").replace(/\/index$/, "");
      records.push({
        title,
        url: `https://learn.microsoft.com/en-us/dotnet/csharp/${route}`,
        section
      });
    }
    records.push(...csharpTocRecords(item, title || section));
  }
  return records;
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const isGcc = new URL(url).hostname === "gcc.gnu.org";
      const response = await fetchDocumentationUrl(url, {
        headers: { "User-Agent": INDEXER_USER_AGENT },
        ...(!isGcc ? { signal: AbortSignal.timeout(30_000) } : {})
      });
      if (response.ok || attempt === 3) return response;
      lastError = new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
  }
  throw lastError;
}
