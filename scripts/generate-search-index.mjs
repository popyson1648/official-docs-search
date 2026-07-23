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
  normalizeDevdocsEntries,
  extractHtmlLinks,
  normalizeSphinxEntries,
  normalizeTc39Entries,
  parseJavadocSearchIndex,
  parseSphinxSearchIndex,
  uniqueRecords
} from "./search-index.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = resolve(root, "public/search-index");
const catalogSource = readFileSync(resolve(root, "src/data/docs-sources.toml"), "utf8");
const args = new Set(process.argv.slice(2));
const mode = args.has("--update") ? "update" : args.has("--check") ? "check" : undefined;

if (!mode || (args.has("--update") && args.has("--check"))) {
  throw new Error("Use exactly one of --update or --check.");
}

const jobs = [
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
    minimumRecords: 30_000,
    knownQueries: ["iterator", "option"],
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
  }
];

const previousManifest = readPreviousManifest(outputDirectory);
const { files, manifest } = await buildSearchIndexArtifacts({
  catalogSource,
  jobs,
  fetcher: fetchWithRetry,
  previousManifest,
  acceptLargeChanges: args.has("--accept-large-changes")
});
publishSearchIndexArtifacts({ files, outputDirectory, mode });

for (const entry of manifest.entries) {
  if (entry.status === "supported") {
    console.log(`${entry.sourceId}/${entry.docsLocale}: ${entry.recordCount} records → ${entry.path}`);
  }
}
console.log(mode === "update" ? "Search indexes updated." : "Search indexes are synchronized.");

function devdocsJob(options) {
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: options.docsLocale,
    adapter: "devdocs",
    upstreamVersion: options.upstreamVersion,
    urlPrefix: options.urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: options.updateFrequency ?? "weekly",
    load: async ({ fetchText }) => {
      const records = normalizeDevdocsEntries(JSON.parse(await fetchText(options.inputUrl)), {
        sourceId: options.sourceId,
        programmingLanguage: options.programmingLanguage,
        docsLocale: options.docsLocale,
        sourceKind: options.sourceKind,
        sourceName: options.sourceName,
        buildUrl: options.buildUrl
      });
      return options.acceptRecord ? records.filter(options.acceptRecord) : records;
    }
  };
}

function documentationUrl(baseUrl, path) {
  const [pathname, fragment] = path.split("#", 2);
  const suffix = pathname.endsWith(".html") ? pathname : `${pathname}.html`;
  return `${baseUrl}${suffix}${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
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

function linkRecords(links, inputUrl, requiredPrefix) {
  return uniqueRecords(
    links.flatMap(({ href, title }) => {
      const url = new URL(href, inputUrl).href;
      if (requiredPrefix && !url.startsWith(requiredPrefix)) return [];
      return [{ title, url }];
    })
  );
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "official-docs-search-indexer/0.2" },
        signal: AbortSignal.timeout(30_000)
      });
      if (response.ok || attempt === 2) return response;
      lastError = new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
