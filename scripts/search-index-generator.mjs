import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { parse } from "smol-toml";

export const SEARCH_INDEX_SCHEMA_VERSION = 2;
export const SEARCH_INDEX_GENERATOR_VERSION = "2";
export const RUNTIME_SEARCH_MANIFEST_FILENAME = "runtime-manifest.json";
/* Content-addressed bundles live in their own directory so the deployment can
   serve them as immutable while both manifests stay revalidated. */
export const SEARCH_INDEX_BUNDLE_DIRECTORY = "bundles";
const SEARCH_INDEX_BUNDLE_PATH_PREFIX = `/search-index/${SEARCH_INDEX_BUNDLE_DIRECTORY}/`;

const SUPPORT_STATUSES = new Set(["supported", "planned", "blocked", "disabled"]);
const RUNTIME_MANIFEST_ENTRY_FIELDS = [
  "sourceId",
  "sourceName",
  "sourceKind",
  "documentKind",
  "programmingLanguage",
  "docsLocale",
  "status",
  "reason",
  "path",
  "recordCount",
  "qualification",
  "qualificationJa"
];

export async function buildSearchIndexArtifacts({
  catalogSource,
  jobs,
  fetcher = fetch,
  previousManifest,
  selectedKeys,
  readPreviousArtifact,
  now = () => new Date(),
  acceptLargeChanges = false,
  concurrency = 4
}) {
  const catalog = parseIndexCatalog(catalogSource);
  const jobsByKey = new Map();
  for (const job of jobs) {
    const key = indexKey(job.sourceId, job.docsLocale);
    if (jobsByKey.has(key)) throw new Error(`Duplicate adapter job: ${key}`);
    jobsByKey.set(key, job);
  }
  const supportedKeys = new Set(
    catalog.flatMap((source) =>
      source.indexes
        .filter((index) => index.status === "supported")
        .map((index) => indexKey(source.id, index.locale))
    )
  );

  for (const key of supportedKeys) {
    if (!jobsByKey.has(key)) throw new Error(`Supported catalog index has no adapter job: ${key}`);
  }
  for (const key of jobsByKey.keys()) {
    if (!supportedKeys.has(key)) throw new Error(`Adapter job is not declared supported in the catalog: ${key}`);
  }

  const previousEntries = new Map(
    (previousManifest?.entries ?? []).map((entry) => [indexKey(entry.sourceId, entry.docsLocale), entry])
  );
  const selection =
    selectedKeys === undefined ? undefined : new Set(selectedKeys);
  if (selection) {
    for (const key of selection) {
      if (!supportedKeys.has(key)) throw new Error(`Selected index is not supported: ${key}`);
    }
    if (!previousManifest || typeof readPreviousArtifact !== "function") {
      throw new Error("Partial generation requires previous manifest and artifact access.");
    }
    if (
      previousManifest.schemaVersion !== SEARCH_INDEX_SCHEMA_VERSION ||
      previousManifest.generatorVersion !== SEARCH_INDEX_GENERATOR_VERSION ||
      previousManifest.catalogSha256 !== sha256(catalogSource)
    ) {
      throw new Error(
        "Partial generation cannot reuse artifacts after schema, generator, or catalog changes."
      );
    }
  }
  const files = new Map();
  const projections = catalog.flatMap((source) =>
    source.indexes.map((support) => ({ source, support }))
  );
  const built = await mapConcurrent(projections, concurrency, async ({ source, support }) => {
    const baseEntry = {
      sourceId: source.id,
      sourceName: source.name,
      sourceKind: source.kind,
      documentKind: source.documentKind,
      programmingLanguage: source.programmingLanguage,
      docsLocale: support.locale,
      status: support.status,
      ...(support.reason ? { reason: support.reason } : {})
    };
    if (support.status !== "supported") return { manifestEntry: baseEntry };

    const key = indexKey(source.id, support.locale);
    const job = jobsByKey.get(key);
    if (!job) throw new Error(`Supported catalog index has no adapter job: ${key}`);
    const previous = previousEntries.get(key);
    if (selection && !selection.has(key)) {
      return reusePreviousArtifact({
        baseEntry,
        source,
        job,
        key,
        previous,
        readPreviousArtifact
      });
    }
    const inputs = [];
    const fetchText = async (url, options = {}) => {
      const response = await fetcher(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
      const rawBody = await response.text();
      const body = options.canonicalize
        ? options.canonicalize(rawBody)
        : rawBody;
      if (typeof body !== "string" || body.length === 0) {
        throw new Error(`Input canonicalizer returned no metadata for ${url}.`);
      }
      const input = {
        url,
        sha256: sha256(body),
        ...(options.canonicalizer ? { canonicalizer: options.canonicalizer } : {}),
        ...(response.headers.get("etag") ? { etag: response.headers.get("etag") } : {}),
        ...(response.headers.get("last-modified")
          ? { lastModified: response.headers.get("last-modified") }
          : {})
      };
      const unchangedInput = previous?.inputs?.find(
        (candidate) =>
          candidate.url === input.url &&
          candidate.sha256 === input.sha256 &&
          candidate.canonicalizer === input.canonicalizer
      );
      inputs.push(unchangedInput ?? input);
      return body;
    };

    const records = await job.load({ fetchText });
    validateRecords(source, job, records);
    if (inputs.length === 0) throw new Error(`${key} did not record an input.`);
    inputs.sort(
      (left, right) =>
        left.url.localeCompare(right.url) ||
        String(left.canonicalizer ?? "").localeCompare(
          String(right.canonicalizer ?? "")
        )
    );

    const bundle = {
      schemaVersion: SEARCH_INDEX_SCHEMA_VERSION,
      sourceId: source.id,
      docsLocale: support.locale,
      urlPrefix: job.urlPrefix,
      records: records.map((record) => [
        record.title,
        record.url.slice(job.urlPrefix.length),
        ...(record.section || record.proposalStatus
          ? [record.section ?? ""]
          : []),
        ...(record.proposalStatus ? [record.proposalStatus] : [])
      ])
    };
    const bundleBytes = `${JSON.stringify(bundle)}\n`;
    const outputSha256 = sha256(bundleBytes);
    const filename = `${source.id}.${support.locale}.${outputSha256.slice(0, 16)}.json`;
    const path = `${SEARCH_INDEX_BUNDLE_PATH_PREFIX}${filename}`;
    const gzipBytes = gzipSync(bundleBytes, { level: 9 }).byteLength;
    const brotliBytes = brotliCompressSync(bundleBytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 }
    }).byteLength;
    enforceChangeGates(job, previous, records.length, gzipBytes, brotliBytes, acceptLargeChanges);

    const combinedInputHash = combinedInputSha256(inputs);
    const retrievedAt =
      previous?.inputSha256 === combinedInputHash && previous.retrievedAt
        ? previous.retrievedAt
        : now().toISOString();

    return {
      filename: bundleArtifactName(filename),
      bundleBytes,
      manifestEntry: {
        ...baseEntry,
        path,
        recordCount: records.length,
        rawBytes: Buffer.byteLength(bundleBytes),
        gzipBytes,
        brotliBytes,
        outputSha256,
        inputSha256: combinedInputHash,
        inputs,
        retrievedAt,
        adapter: job.adapter,
        upstreamVersion: job.upstreamVersion,
        attribution: job.attribution,
        licenseUrl: job.licenseUrl,
        updateFrequency: job.updateFrequency,
        knownQueries: job.knownQueries,
        ...(source.qualificationEn || job.qualification
          ? { qualification: source.qualificationEn ?? job.qualification }
          : {}),
        ...(source.qualificationJa || job.qualificationJa
          ? { qualificationJa: source.qualificationJa ?? job.qualificationJa }
          : {})
      }
    };
  });
  for (const entry of built) {
    if (entry.filename) files.set(entry.filename, entry.bundleBytes);
  }
  const manifestEntries = built.map((entry) => entry.manifestEntry);

  const manifest = {
    schemaVersion: SEARCH_INDEX_SCHEMA_VERSION,
    generatorVersion: SEARCH_INDEX_GENERATOR_VERSION,
    catalogSha256: sha256(catalogSource),
    entries: manifestEntries
  };
  files.set(
    RUNTIME_SEARCH_MANIFEST_FILENAME,
    `${JSON.stringify(buildRuntimeSearchManifest(manifest), null, 2)}\n`
  );
  files.set("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, manifest };
}

export function buildRuntimeSearchManifest(manifest) {
  if (
    !manifest ||
    !Number.isInteger(manifest.schemaVersion) ||
    typeof manifest.generatorVersion !== "string" ||
    typeof manifest.catalogSha256 !== "string" ||
    !Array.isArray(manifest.entries)
  ) {
    throw new Error("Cannot project an invalid search-index manifest.");
  }

  return {
    schemaVersion: manifest.schemaVersion,
    generatorVersion: manifest.generatorVersion,
    catalogSha256: manifest.catalogSha256,
    entries: manifest.entries.map((entry) =>
      Object.fromEntries(
        RUNTIME_MANIFEST_ENTRY_FIELDS.flatMap((field) =>
          entry[field] === undefined ? [] : [[field, entry[field]]]
        )
      )
    )
  };
}

function reusePreviousArtifact({
  baseEntry,
  source,
  job,
  key,
  previous,
  readPreviousArtifact
}) {
  if (!previous?.path) {
    throw new Error(`Cannot reuse missing previous manifest entry: ${key}`);
  }
  const expectedMetadata = {
    ...baseEntry,
    adapter: job.adapter,
    upstreamVersion: job.upstreamVersion,
    attribution: job.attribution,
    licenseUrl: job.licenseUrl,
    updateFrequency: job.updateFrequency,
    knownQueries: job.knownQueries,
    ...(source.qualificationEn || job.qualification
      ? { qualification: source.qualificationEn ?? job.qualification }
      : {}),
    ...(source.qualificationJa || job.qualificationJa
      ? { qualificationJa: source.qualificationJa ?? job.qualificationJa }
      : {})
  };
  for (const [field, value] of Object.entries(expectedMetadata)) {
    if (JSON.stringify(previous[field]) !== JSON.stringify(value)) {
      throw new Error(
        `Cannot reuse ${key}; static metadata changed for ${field}. Run a full generation.`
      );
    }
  }

  const filename = basename(previous.path);
  if (previous.path !== `${SEARCH_INDEX_BUNDLE_PATH_PREFIX}${filename}`) {
    throw new Error(`Cannot reuse ${key}; invalid previous artifact path.`);
  }
  const bundleBytes = readPreviousArtifact(bundleArtifactName(filename));
  if (typeof bundleBytes !== "string") {
    throw new Error(`Cannot reuse ${key}; previous artifact is unavailable.`);
  }
  if (sha256(bundleBytes) !== previous.outputSha256) {
    throw new Error(`Cannot reuse ${key}; previous artifact hash does not match.`);
  }
  const rawBytes = Buffer.byteLength(bundleBytes);
  const gzipBytes = gzipSync(bundleBytes, { level: 9 }).byteLength;
  const brotliBytes = brotliCompressSync(bundleBytes, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 }
  }).byteLength;
  if (
    rawBytes !== previous.rawBytes ||
    gzipBytes !== previous.gzipBytes ||
    brotliBytes !== previous.brotliBytes
  ) {
    throw new Error(`Cannot reuse ${key}; previous artifact sizes do not match.`);
  }
  if (
    !Array.isArray(previous.inputs) ||
    previous.inputs.length === 0 ||
    previous.inputs.some(
      (input) =>
        typeof input?.url !== "string" ||
        typeof input?.sha256 !== "string"
    ) ||
    combinedInputSha256(previous.inputs) !== previous.inputSha256
  ) {
    throw new Error(`Cannot reuse ${key}; previous input provenance does not match.`);
  }
  const bundle = JSON.parse(bundleBytes);
  if (
    bundle.schemaVersion !== SEARCH_INDEX_SCHEMA_VERSION ||
    bundle.sourceId !== previous.sourceId ||
    bundle.docsLocale !== previous.docsLocale ||
    bundle.urlPrefix !== job.urlPrefix ||
    !Array.isArray(bundle.records) ||
    bundle.records.length !== previous.recordCount
  ) {
    throw new Error(`Cannot reuse ${key}; previous artifact metadata does not match.`);
  }
  return {
    filename: bundleArtifactName(filename),
    bundleBytes,
    manifestEntry: previous
  };
}

function bundleArtifactName(filename) {
  return `${SEARCH_INDEX_BUNDLE_DIRECTORY}/${filename}`;
}

function combinedInputSha256(inputs) {
  return sha256(
    inputs
      .map((input) =>
        input.canonicalizer
          ? `${input.url}\0${input.canonicalizer}\0${input.sha256}`
          : `${input.url}\0${input.sha256}`
      )
      .join("\n")
  );
}

export function publishSearchIndexArtifacts({ files, outputDirectory, mode }) {
  if (mode !== "update" && mode !== "check") throw new Error(`Unsupported publish mode: ${mode}`);
  const parent = dirname(outputDirectory);
  mkdirSync(parent, { recursive: true });
  const stage = mkdtempSync(join(parent, ".search-index-stage-"));

  try {
    for (const [filename, contents] of files) {
      const stagedPath = join(stage, filename);
      mkdirSync(dirname(stagedPath), { recursive: true });
      writeFileSync(stagedPath, contents);
    }

    if (mode === "check") {
      const differences = compareArtifacts(files, outputDirectory);
      if (differences.length > 0) {
        throw new Error(`Search indexes are not synchronized:\n${differences.join("\n")}`);
      }
      return;
    }

    mkdirSync(outputDirectory, { recursive: true });
    for (const filename of [...files.keys()].filter((name) => name !== "manifest.json")) {
      const target = join(outputDirectory, filename);
      mkdirSync(dirname(target), { recursive: true });
      renameSync(join(stage, filename), target);
    }
    renameSync(join(stage, "manifest.json"), join(outputDirectory, "manifest.json"));

    const expected = new Set(files.keys());
    for (const filename of listArtifactNames(outputDirectory)) {
      if (!expected.has(filename)) rmSync(join(outputDirectory, filename));
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

export function parseIndexCatalog(source) {
  const data = parse(source);
  const languages = Array.isArray(data.languages) ? data.languages : [];
  return languages.flatMap((language) => {
    const sources = Array.isArray(language.sources) ? language.sources : [];
    return sources.map((source) => {
      const siteLocales = stringArray(source.site_locales);
      const qualificationEn = String(source.qualification_en ?? "").trim();
      const qualificationJa = String(source.qualification_ja ?? "").trim();
      if (Boolean(qualificationEn) !== Boolean(qualificationJa)) {
        throw new Error(
          `${source.id} must provide both qualification_en and qualification_ja.`
        );
      }
      const indexes = Array.isArray(source.indexes)
        ? source.indexes.map((index) => ({
            locale: String(index.locale ?? ""),
            status: String(index.status ?? ""),
            reason: String(index.reason ?? "").trim() || undefined
          }))
        : [];
      if (indexes.length !== siteLocales.length) {
        throw new Error(`${source.id} must declare one index status for every site locale.`);
      }
      const locales = new Set();
      for (const index of indexes) {
        if (!siteLocales.includes(index.locale)) {
          throw new Error(`${source.id} index locale is not a site locale: ${index.locale}`);
        }
        if (locales.has(index.locale)) throw new Error(`${source.id} repeats index locale ${index.locale}.`);
        if (!SUPPORT_STATUSES.has(index.status)) {
          throw new Error(`${source.id}/${index.locale} has invalid status ${index.status}.`);
        }
        if (index.status !== "supported" && !index.reason) {
          throw new Error(`${source.id}/${index.locale} requires a status reason.`);
        }
        locales.add(index.locale);
      }
      return {
        id: String(source.id ?? ""),
        name: String(source.name ?? source.id ?? ""),
        kind: normalizeKind(source.kind),
        documentKind: normalizeDocumentKind(source.document_kind),
        programmingLanguage: String(language.id ?? ""),
        domains: stringArray(source.domains),
        pathPrefixes: stringArray(source.path_prefixes),
        siteLocales,
        indexes,
        qualificationEn: qualificationEn || undefined,
        qualificationJa: qualificationJa || undefined
      };
    });
  });
}

export function readPreviousManifest(outputDirectory) {
  const path = resolve(outputDirectory, "manifest.json");
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

function compareArtifacts(files, outputDirectory) {
  const differences = [];
  const expectedNames = new Set(files.keys());
  for (const [filename, contents] of files) {
    const path = join(outputDirectory, filename);
    if (!existsSync(path)) differences.push(`missing ${filename}`);
    else {
      const existing = readFileSync(path, "utf8");
      if (existing !== contents) {
        differences.push(
          filename === "manifest.json"
            ? describeManifestDifference(existing, contents)
            : `changed ${filename}`
        );
      }
    }
  }
  for (const filename of listArtifactNames(outputDirectory)) {
    if (!expectedNames.has(filename)) differences.push(`obsolete ${filename}`);
  }
  return differences;
}

/* Published artifact names are directory-relative and always use forward
   slashes so they can be compared with manifest paths on every platform. */
function listArtifactNames(outputDirectory) {
  if (!existsSync(outputDirectory)) return [];
  return readdirSync(outputDirectory, { recursive: true })
    .map((entry) => entry.split(sep).join("/"))
    .filter(
      (name) =>
        name.endsWith(".json") && statSync(join(outputDirectory, name)).isFile()
    );
}

function describeManifestDifference(existingSource, expectedSource) {
  const existing = JSON.parse(existingSource);
  const expected = JSON.parse(expectedSource);
  const changed = [];
  for (const field of ["schemaVersion", "generatorVersion", "catalogSha256"]) {
    if (existing[field] !== expected[field]) changed.push(field);
  }
  const existingEntries = new Map(
    (existing.entries ?? []).map((entry) => [
      indexKey(entry.sourceId, entry.docsLocale),
      entry
    ])
  );
  for (const entry of expected.entries ?? []) {
    const key = indexKey(entry.sourceId, entry.docsLocale);
    const previous = existingEntries.get(key);
    if (!previous) {
      changed.push(`${key}:added`);
      continue;
    }
    const fields = [...new Set([...Object.keys(previous), ...Object.keys(entry)])]
      .filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(entry[field]));
    if (fields.length > 0) changed.push(`${key}:${fields.join(",")}`);
    existingEntries.delete(key);
  }
  for (const key of existingEntries.keys()) changed.push(`${key}:removed`);
  const detail = changed.slice(0, 10).join("; ");
  return `changed manifest.json${detail ? ` (${detail}${changed.length > 10 ? "; …" : ""})` : ""}`;
}

function validateRecords(source, job, records) {
  if (records.length < job.minimumRecords) {
    throw new Error(
      `${source.id}/${job.docsLocale} produced ${records.length} records; expected at least ${job.minimumRecords}.`
    );
  }
  for (const record of records) {
    if (!record.title.trim()) throw new Error(`Untitled result URL: ${record.url}`);
    const url = new URL(record.url);
    if (url.protocol !== "https:") throw new Error(`Non-HTTPS result URL: ${record.url}`);
    if (!record.url.startsWith(job.urlPrefix)) {
      throw new Error(`Result URL is outside its bundle prefix: ${record.url}`);
    }
    if (!source.domains.includes(url.hostname)) {
      throw new Error(`Result URL host is outside the catalog: ${record.url}`);
    }
    if (
      source.pathPrefixes.length > 0 &&
      !source.pathPrefixes.some((prefix) => url.pathname.startsWith(prefix))
    ) {
      throw new Error(`Result URL path is outside the catalog: ${record.url}`);
    }
  }
}

function enforceChangeGates(job, previous, recordCount, gzipBytes, brotliBytes, accepted) {
  if (!previous || accepted) return;
  const maximumRecordDropRatio = job.maximumRecordDropRatio ?? 0.2;
  if (
    previous.recordCount &&
    recordCount < previous.recordCount * (1 - maximumRecordDropRatio)
  ) {
    throw new Error(
      `${job.sourceId}/${job.docsLocale} record count dropped from ${previous.recordCount} to ${recordCount}.`
    );
  }
  const maximumSizeChangeRatio = job.maximumSizeChangeRatio ?? 0.5;
  for (const [label, before, after] of [
    ["gzip", previous.gzipBytes, gzipBytes],
    ["brotli", previous.brotliBytes, brotliBytes]
  ]) {
    if (before && Math.abs(after - before) / before > maximumSizeChangeRatio) {
      throw new Error(
        `${job.sourceId}/${job.docsLocale} ${label} size changed from ${before} to ${after}.`
      );
    }
  }
}

function normalizeKind(value) {
  if (value === "conventional" || value === "community") return value;
  return "official";
}

function normalizeDocumentKind(value) {
  if (
    value === "specification" ||
    value === "proposal" ||
    value === "design-record"
  ) {
    return value;
  }
  return "reference";
}

function stringArray(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function indexKey(sourceId, locale) {
  return `${sourceId}/${locale}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function mapConcurrent(values, concurrency, callback) {
  const limit = Math.max(1, Math.min(values.length || 1, Number(concurrency) || 1));
  const results = new Array(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await callback(values[index], index);
      }
    })
  );
  return results;
}
