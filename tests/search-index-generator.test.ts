import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildRuntimeSearchManifest,
  buildSearchIndexArtifacts,
  publishSearchIndexArtifacts
} from "../scripts/search-index-generator.mjs";
import { normalizeSphinxEntries } from "../scripts/search-index.mjs";

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
  it("normalizes inline Sphinx title markup to plain text", () => {
    const records = normalizeSphinxEntries(
      {
        docnames: ["library/pathlib"],
        titles: [
          '<code class="xref"><span class="pre">pathlib</span></code> --- Object paths'
        ],
        alltitles: {
          '<code class="pre">glob</code> comparison': [
            [0, "comparison-to-the-glob-module"]
          ]
        }
      },
      {
        sourceId: "python-docs",
        programmingLanguage: "python",
        docsLocale: "ja",
        sourceKind: "official",
        sourceName: "Python Documentation",
        buildUrl: (path: string, fragment?: string | null) =>
          `https://docs.example.test/${path}${fragment ? `#${fragment}` : ""}`
      }
    );

    expect(records).toEqual([
      expect.objectContaining({
        title: "pathlib — Object paths"
      }),
      expect.objectContaining({
        title: "glob comparison",
        section: "pathlib — Object paths"
      })
    ]);
    expect(JSON.stringify(records)).not.toContain("<code");
  });

  it("reuses retrieval time and produces identical artifacts for identical input", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    const second = await build(
      fixtureJob(),
      new Date("2026-07-24T00:00:00Z"),
      first.manifest
    );

    expect([...second.files]).toEqual([...first.files]);
  });

  it("projects only runtime search fields while preserving manifest identity and order", async () => {
    const generated = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    const runtimeManifest = buildRuntimeSearchManifest(generated.manifest);
    const publishedRuntimeManifest = JSON.parse(
      generated.files.get("runtime-manifest.json") ?? ""
    );

    expect(publishedRuntimeManifest).toEqual(runtimeManifest);
    expect(runtimeManifest).toMatchObject({
      schemaVersion: generated.manifest.schemaVersion,
      generatorVersion: generated.manifest.generatorVersion,
      catalogSha256: generated.manifest.catalogSha256
    });
    expect(
      runtimeManifest.entries.map((entry) => [
        entry.sourceId,
        entry.docsLocale
      ])
    ).toEqual(
      generated.manifest.entries.map((entry) => [
        entry.sourceId,
        entry.docsLocale
      ])
    );
    expect(runtimeManifest.entries[0]).toEqual({
      sourceId: "example-docs",
      sourceName: "Example Documentation",
      sourceKind: "official",
      documentKind: "reference",
      programmingLanguage: "example",
      docsLocale: "en",
      status: "supported",
      path: expect.stringMatching(/^\/search-index\/bundles\/example-docs\.en\.[a-f0-9]{16}\.json$/),
      recordCount: 1
    });
    expect(runtimeManifest.entries[1]).toEqual({
      sourceId: "example-docs",
      sourceName: "Example Documentation",
      sourceKind: "official",
      documentKind: "reference",
      programmingLanguage: "example",
      docsLocale: "ja",
      status: "planned",
      reason: "Fixture adapter is English-only."
    });
    for (const entry of runtimeManifest.entries) {
      expect(entry).not.toHaveProperty("inputs");
      expect(entry).not.toHaveProperty("outputSha256");
      expect(entry).not.toHaveProperty("knownQueries");
      expect(entry).not.toHaveProperty("attribution");
      expect(entry).not.toHaveProperty("licenseUrl");
    }
  });

  it("sorts parallel input provenance independently of response completion order", async () => {
    const parallelJob = {
      ...fixtureJob(),
      load: async ({
        fetchText
      }: {
        fetchText: (url: string) => Promise<string>;
      }) => {
        await Promise.all([
          fetchText("https://input.test/a.json"),
          fetchText("https://input.test/b.json")
        ]);
        return [{ title: "Record", url: "https://example.test/docs/record" }];
      }
    };
    const fetchWithDelay = (slowSuffix: string) =>
      async (input: string | URL | Request) => {
        const url = String(input);
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, url.endsWith(slowSuffix) ? 10 : 0)
        );
        return new Response(url.endsWith("a.json") ? "a" : "b");
      };
    const first = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [parallelJob],
      fetcher: fetchWithDelay("a.json"),
      now: () => new Date("2026-07-23T00:00:00Z")
    });
    const second = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [parallelJob],
      fetcher: fetchWithDelay("b.json"),
      previousManifest: first.manifest,
      now: () => new Date("2026-07-24T00:00:00Z")
    });

    expect([...second.files]).toEqual([...first.files]);
  });

  it("copies bilingual catalog qualifications into supported manifest entries", async () => {
    const qualifiedCatalog = catalog.replace(
      'indexes = [\n  { locale = "en", status = "supported" },',
      'qualification_en = "Current English caveat."\nqualification_ja = "現在の日本語の注意書き。"\nindexes = [\n  { locale = "en", status = "supported" },'
    );
    const generated = await buildSearchIndexArtifacts({
      catalogSource: qualifiedCatalog,
      jobs: [fixtureJob()],
      fetcher: fixtureFetch,
      now: () => new Date("2026-07-23T00:00:00Z")
    });
    const entry = generated.manifest.entries.find(
      (candidate) => candidate.sourceId === "example-docs" && candidate.docsLocale === "en"
    );

    expect(entry).toMatchObject({
      qualification: "Current English caveat.",
      qualificationJa: "現在の日本語の注意書き。"
    });
  });

  it("hashes declared canonical metadata instead of volatile page decoration", async () => {
    const canonicalJob = (canonicalizer: string) => ({
      ...fixtureJob(),
      load: async ({
        fetchText
      }: {
        fetchText: (
          url: string,
          options?: {
            canonicalizer?: string;
            canonicalize?: (source: string) => string;
          }
        ) => Promise<string>;
      }) => {
        await fetchText("https://input.test/index.html", {
          canonicalizer,
          canonicalize: (source) => source.replace(/ nonce="[^"]+"/g, "")
        });
        return [{ title: "Record", url: "https://example.test/docs/record" }];
      }
    });
    const first = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [canonicalJob("fixture-links-v1")],
      fetcher: async () => new Response('<a href="/record" nonce="first">Record</a>'),
      now: () => new Date("2026-07-23T00:00:00Z")
    });
    const second = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [canonicalJob("fixture-links-v1")],
      fetcher: async () => new Response('<a href="/record" nonce="second">Record</a>'),
      previousManifest: first.manifest,
      now: () => new Date("2026-07-24T00:00:00Z")
    });

    expect([...second.files]).toEqual([...first.files]);
    const canonicalInput = (
      second.manifest as unknown as { entries: Array<{ inputs: unknown[] }> }
    ).entries[0].inputs[0];
    expect(canonicalInput).toMatchObject({
      canonicalizer: "fixture-links-v1"
    });

    const third = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [canonicalJob("fixture-links-v2")],
      fetcher: async () => new Response('<a href="/record" nonce="third">Record</a>'),
      previousManifest: second.manifest,
      now: () => new Date("2026-07-25T00:00:00Z")
    });
    const versionedEntry = (
      third.manifest as unknown as {
        entries: Array<{
          inputSha256: string;
          retrievedAt: string;
          inputs: Array<{ canonicalizer?: string }>;
        }>;
      }
    ).entries[0];
    expect(versionedEntry.inputs[0].canonicalizer).toBe("fixture-links-v2");
    expect(versionedEntry.inputSha256).not.toBe(
      (
        second.manifest as unknown as {
          entries: Array<{ inputSha256: string }>;
        }
      ).entries[0].inputSha256
    );
    expect(versionedEntry.retrievedAt).toBe("2026-07-25T00:00:00.000Z");
  });

  it("preserves prior validators when identical input is served with new CDN headers", async () => {
    const first = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [fixtureJob()],
      fetcher: async () =>
        new Response('{"fixture":true}', {
          headers: { etag: '"first"', "last-modified": "Thu, 23 Jul 2026 00:00:00 GMT" }
        }),
      now: () => new Date("2026-07-23T00:00:00Z")
    });
    const second = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [fixtureJob()],
      fetcher: async () =>
        new Response('{"fixture":true}', {
          headers: { etag: '"second"', "last-modified": "Fri, 24 Jul 2026 00:00:00 GMT" }
        }),
      previousManifest: first.manifest,
      now: () => new Date("2026-07-24T00:00:00Z")
    });

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

  it("detects a stale runtime manifest in check mode", async () => {
    const outputDirectory = temporaryDirectory();
    const generated = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    publishSearchIndexArtifacts({
      files: generated.files,
      outputDirectory,
      mode: "update"
    });
    writeFileSync(
      join(outputDirectory, "runtime-manifest.json"),
      '{"stale":true}\n'
    );

    expect(() =>
      publishSearchIndexArtifacts({
        files: generated.files,
        outputDirectory,
        mode: "check"
      })
    ).toThrow(/changed runtime-manifest\.json/);
  });

  it("rejects corrupt upstream data", async () => {
    const job = {
      ...fixtureJob(),
      load: async ({ fetchText }: { fetchText: (url: string) => Promise<string> }) =>
        JSON.parse(await fetchText("https://input.test/index.json"))
    };
    await expect(build(job, new Date("2026-07-23T00:00:00Z"))).rejects.toThrow();
  });

  it("rejects duplicate source-locale adapter jobs", async () => {
    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob(), fixtureJob()],
        fetcher: fixtureFetch
      })
    ).rejects.toThrow(/Duplicate adapter job: example-docs\/en/);
  });

  it("builds jobs concurrently while preserving catalog manifest order", async () => {
    const secondSource = `
[[languages.sources]]
id = "second-docs"
kind = "official"
name = "Second Documentation"
url = "https://second.test/docs/"
domains = ["second.test"]
path_prefixes = ["/docs/"]
default_enabled = true
site_locales = ["en"]
indexes = [{ locale = "en", status = "supported" }]
`;
    let active = 0;
    let maximumActive = 0;
    const fetcher = async (input: string | URL | Request) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, String(input).includes("example") ? 10 : 1)
      );
      active -= 1;
      return new Response('{"fixture":true}');
    };
    const secondJob = {
      ...fixtureJob(),
      sourceId: "second-docs",
      urlPrefix: "https://second.test/docs/",
      load: async ({ fetchText }: { fetchText: (url: string) => Promise<string> }) => {
        await fetchText("https://input.test/second.json");
        return [{ title: "Second", url: "https://second.test/docs/second" }];
      }
    };

    const result = await buildSearchIndexArtifacts({
      catalogSource: `${catalog}${secondSource}`,
      jobs: [fixtureJob(), secondJob],
      fetcher,
      concurrency: 2,
      now: () => new Date("2026-07-23T00:00:00Z")
    });

    expect(maximumActive).toBe(2);
    expect(result.manifest.entries.map((entry) => entry.sourceId)).toEqual([
      "example-docs",
      "example-docs",
      "second-docs"
    ]);
  });

  it("fetches only selected indexes and reuses verified committed artifacts", async () => {
    const secondSource = `
[[languages.sources]]
id = "second-docs"
kind = "official"
name = "Second Documentation"
url = "https://second.test/docs/"
domains = ["second.test"]
path_prefixes = ["/docs/"]
default_enabled = true
site_locales = ["en"]
indexes = [{ locale = "en", status = "supported" }]
`;
    const secondJob = {
      ...fixtureJob(),
      sourceId: "second-docs",
      urlPrefix: "https://second.test/docs/",
      load: async ({ fetchText }: { fetchText: (url: string) => Promise<string> }) => {
        await fetchText("https://input.test/second.json");
        return [{ title: "Second", url: "https://second.test/docs/second" }];
      }
    };
    const catalogSource = `${catalog}${secondSource}`;
    const first = await buildSearchIndexArtifacts({
      catalogSource,
      jobs: [fixtureJob(), secondJob],
      fetcher: fixtureFetch,
      now: () => new Date("2026-07-23T00:00:00Z")
    });
    let fetchCount = 0;
    const partial = await buildSearchIndexArtifacts({
      catalogSource,
      jobs: [fixtureJob(), secondJob],
      fetcher: async () => {
        fetchCount += 1;
        return await fixtureFetch();
      },
      previousManifest: first.manifest,
      selectedKeys: ["second-docs/en"],
      readPreviousArtifact: (filename: string) => first.files.get(filename),
      now: () => new Date("2026-07-24T00:00:00Z")
    });

    expect(fetchCount).toBe(1);
    expect([...partial.files]).toEqual([...first.files]);
  });

  it("fails partial generation when unselected static metadata changed", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [{ ...fixtureJob(), upstreamVersion: "fixture-2" }],
        fetcher: fixtureFetch,
        previousManifest: first.manifest,
        selectedKeys: [],
        readPreviousArtifact: (filename: string) => first.files.get(filename)
      })
    ).rejects.toThrow(/static metadata changed/);
  });

  it("performs zero fetches for an empty explicit selection", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    const partial = await buildSearchIndexArtifacts({
      catalogSource: catalog,
      jobs: [fixtureJob()],
      fetcher: async () => {
        throw new Error("unexpected fetch");
      },
      previousManifest: first.manifest,
      selectedKeys: [],
      readPreviousArtifact: (filename: string) => first.files.get(filename)
    });

    expect([...partial.files]).toEqual([...first.files]);
  });

  it("rejects a corrupt reused artifact", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: fixtureFetch,
        previousManifest: first.manifest,
        selectedKeys: [],
        readPreviousArtifact: () => "{\"corrupt\":true}\n"
      })
    ).rejects.toThrow(/artifact hash does not match/);
  });

  it("rejects corrupt reused size and provenance metadata", async () => {
    const first = await build(fixtureJob(), new Date("2026-07-23T00:00:00Z"));
    const artifactReader = (filename: string) => first.files.get(filename);
    const withEntry = (changes: Record<string, unknown>) => ({
      ...first.manifest,
      entries: first.manifest.entries.map((entry) =>
        entry.sourceId === "example-docs" && entry.docsLocale === "en"
          ? { ...entry, ...changes }
          : entry
      )
    });

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: fixtureFetch,
        previousManifest: withEntry({
          rawBytes: Number(first.manifest.entries[0].rawBytes) + 1
        }),
        selectedKeys: [],
        readPreviousArtifact: artifactReader
      })
    ).rejects.toThrow(/artifact sizes do not match/);

    await expect(
      buildSearchIndexArtifacts({
        catalogSource: catalog,
        jobs: [fixtureJob()],
        fetcher: fixtureFetch,
        previousManifest: withEntry({ inputSha256: "0".repeat(64) }),
        selectedKeys: [],
        readPreviousArtifact: artifactReader
      })
    ).rejects.toThrow(/input provenance does not match/);
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
    readdirSync(directory, { recursive: true })
      .map((entry) => String(entry))
      .filter((name) => statSync(join(directory, name)).isFile())
      .sort()
      .map((name) => [name, readFileSync(join(directory, name), "utf8")])
  );
}
