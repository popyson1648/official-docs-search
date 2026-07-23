import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSearchIndexArtifacts,
  publishSearchIndexArtifacts
} from "../scripts/search-index-generator.mjs";

const temporaryDirectories: string[] = [];
const catalog = `
[[languages]]
id = "example"
name = "Example"
aliases = []
bare_aliases = ["example"]

[[languages.sources]]
id = "example-docs"
kind = "official"
name = "Example Documentation"
url = "https://example.test/docs/"
domains = ["example.test"]
path_prefixes = ["/docs/"]
default_enabled = true
site_locales = ["en", "ja"]
indexes = [
  { locale = "en", status = "supported" },
  { locale = "ja", status = "planned", reason = "Fixture adapter is English-only." }
]
`;

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("search index generation", () => {
  it("reuses retrieval time and produces identical artifacts for identical input", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    const second = await build(
      fixtureJob(),
      new Date("2026-07-24T00:00:00Z"),
      first.manifest
    );

    expect([...second.files]).toEqual([...first.files]);
  });

  it("does not touch published artifacts when a later adapter fails", async () => {
    const outputDirectory = temporaryDirectory();
    writeFileSync(join(outputDirectory, "manifest.json"), "existing manifest\n");
    writeFileSync(join(outputDirectory, "existing.json"), "existing bundle\n");
    const before = snapshot(outputDirectory);

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: `${catalog}
[[languages.sources]]
id = "second-docs"
kind = "official"
name = "Second Documentation"
url = "https://example.test/docs/"
domains = ["example.test"]
path_prefixes = ["/docs/"]
default_enabled = true
site_locales = ["en"]
indexes = [{ locale = "en", status = "supported" }]
`,
        jobs: [
          fixtureJob(),
          {
            ...fixtureJob(),
            sourceId: "second-docs",
            load: async () => {
              throw new Error("adapter failed");
            }
          }
        ],
        fetcher: fixtureFetch,
        now: () => new Date("2026-07-23T00:00:00Z")
      })
    ).rejects.toThrow();
    expect(snapshot(outputDirectory)).toEqual(before);
  });

  it("checks synchronized output without changing it", async () => {
    const outputDirectory = temporaryDirectory();
    const generated = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    publishSearchIndexArtifacts({
      files: generated.files,
      outputDirectory,
      mode: "update"
    });
    const before = snapshot(outputDirectory);

    publishSearchIndexArtifacts({
      files: generated.files,
      outputDirectory,
      mode: "check"
    });
    expect(snapshot(outputDirectory)).toEqual(before);
  });

  it("rejects corrupt upstream data", async () => {
    const job = {
      ...fixtureJob(),
      load: async ({ fetchText }: { fetchText: (url: string) => Promise<string> }) =>
        JSON.parse(await fetchText("https://input.test/index.json"))
    };
    await expect(build(job, new Date("2026-07-23T00:00:00Z"))).rejects.toThrow();
  });

  it("rejects timeouts and non-success responses", async () => {
    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: async () => {
          throw new DOMException("timed out", "TimeoutError");
        }
      })
    ).rejects.toThrow(/timed out/);

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: async () => new Response("unavailable", { status: 503 })
      })
    ).rejects.toThrow(/HTTP 503/);
  });

  it("requires an explicit override for large count or compressed-size changes", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    const previousEntry = first.manifest.entries.find(
      (entry) => entry.sourceId === "example-docs" && entry.docsLocale === "en"
    );
    expect(previousEntry).toBeDefined();

    const changedPreviousManifest = {
      ...first.manifest,
      entries: [
        {
          ...previousEntry,
          recordCount: 10,
          gzipBytes: 1,
          brotliBytes: 1
        }
      ]
    };
    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: fixtureFetch,
        previousManifest: changedPreviousManifest,
        now: () => new Date("2026-07-24T00:00:00Z")
      })
    ).rejects.toThrow(/record count dropped/);

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: fixtureFetch,
        previousManifest: changedPreviousManifest,
        now: () => new Date("2026-07-24T00:00:00Z"),
        acceptLargeChanges: true
      })
    ).resolves.toBeDefined();
  });
});

function fixtureJob() {
  return {
    sourceId: "example-docs",
    programmingLanguage: "example",
    docsLocale: "en",
    adapter: "fixture",
    upstreamVersion: "fixture-1",
    urlPrefix: "https://example.test/docs/",
    minimumRecords: 1,
    knownQueries: ["record"],
    attribution: "Fixture attribution.",
    licenseUrl: "https://example.test/license",
    updateFrequency: "weekly",
    load: async ({ fetchText }: { fetchText: (url: string) => Promise<string> }) => {
      await fetchText("https://input.test/index.json");
      return [
        {
          title: "Record",
          url: "https://example.test/docs/record",
          section: "Fixture"
        }
      ];
    }
  };
}

async function build(
  job: ReturnType<typeof fixtureJob>,
  now: Date,
  previousManifest?: unknown
) {
  return await buildSearchIndexArtifacts({
    catalogSource: catalog,
    jobs: [job],
    fetcher: fixtureFetch,
    previousManifest,
    now: () => now
  });
}

async function fixtureFetch() {
  return new Response('{"fixture":true}', {
    headers: {
      etag: '"fixture"',
      "last-modified": "Thu, 23 Jul 2026 00:00:00 GMT"
    }
  });
}

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "official-docs-search-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function snapshot(directory: string) {
  return Object.fromEntries(
    readdirSync(directory)
      .sort()
      .map((filename) => [filename, readFileSync(join(directory, filename), "utf8")])
  );
}
