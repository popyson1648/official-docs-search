import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { request } from "node:http";
import net from "node:net";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "../..");
const manifestFile = resolve(root, "dist/client/search-index/manifest.json");
const runtimeManifestFile = resolve(
  root,
  "dist/client/search-index/runtime-manifest.json"
);
let app;
let baseUrl;
let manifest;

before(async () => {
  const port = await availablePort();
  const logs = [];
  const child = spawn(process.execPath, ["scripts/serve-production.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  app = { child, logs };
  baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer();
  manifest = JSON.parse(await readFile(manifestFile, "utf8"));
});

after(async () => {
  if (!app || app.child.exitCode !== null) return;
  app.child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolveExit) => app.child.once("exit", () => resolveExit(true))),
    new Promise((resolveDelay) => setTimeout(() => resolveDelay(false), 3_000))
  ]);
  if (!exited && app.child.exitCode === null) app.child.kill("SIGKILL");
});

test("serves the production SSR build with its bundled catalog", async () => {
  const response = await rawRequest("/");

  assert.equal(response.statusCode, 200);
  assert.match(response.body.toString("utf8"), /data-search-form/);
  assert.doesNotMatch(app.logs.join(""), /ENOENT|docs-sources\.toml/);
});

test("negotiates compression for HTML, CSS, and JavaScript", async () => {
  const assets = [
    { path: "/", readSource: () => rawRequest("/") },
    {
      path: await builtAssetPath(".css"),
      readSource: async (pathname) => ({
        body: await readFile(resolve(root, `dist/client${pathname}`))
      })
    },
    {
      path: await builtAssetPath(".js"),
      readSource: async (pathname) => ({
        body: await readFile(resolve(root, `dist/client${pathname}`))
      })
    }
  ];

  for (const asset of assets) {
    const source = await asset.readSource(asset.path);
    for (const encoding of ["br", "gzip"]) {
      const response = await rawRequest(asset.path, {
        "Accept-Encoding": encoding
      });

      assert.equal(response.statusCode, 200, asset.path);
      assert.equal(response.headers["content-encoding"], encoding, asset.path);
      assert.match(
        response.headers.vary || "",
        /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i,
        asset.path
      );
      const decoded =
        encoding === "br"
          ? brotliDecompressSync(response.body)
          : gunzipSync(response.body);
      assert.deepEqual(decoded, source.body, asset.path);
    }
  }
});

test("precompresses every built search-index JSON without changing its bytes", async () => {
  const files = await findJsonFiles(resolve(root, "dist/client/search-index"));
  assert.ok(files.length > 0);

  for (const file of files) {
    const [source, brotli, gzip] = await Promise.all([
      readFile(file),
      readFile(`${file}.br`),
      readFile(`${file}.gz`)
    ]);
    assert.deepEqual(brotliDecompressSync(brotli), source, file);
    assert.deepEqual(gunzipSync(gzip), source, file);
  }
});

test("serves both manifests from sidecars with stable revalidation headers", async () => {
  const manifests = [
    {
      path: "/search-index/manifest.json",
      file: manifestFile
    },
    {
      path: "/search-index/runtime-manifest.json",
      file: runtimeManifestFile
    }
  ];

  for (const item of manifests) {
    const source = await readFile(item.file);
    const sidecar = await readFile(`${item.file}.br`);
    const response = await rawRequest(item.path, {
      "Accept-Encoding": "br"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-encoding"], "br");
    assert.match(response.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
    assert.match(response.headers["cache-control"] || "", /\bno-cache\b/);
    assert.equal(response.headers.etag, contentEtag(source));
    assert.deepEqual(response.body, sidecar);
    assert.deepEqual(brotliDecompressSync(response.body), source);

    const conditional = await rawRequest(item.path, {
      "Accept-Encoding": "br",
      "If-None-Match": response.headers.etag
    });
    assert.equal(conditional.statusCode, 304);
    assert.equal(conditional.body.byteLength, 0);
    assert.match(conditional.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
  }
});

test("negotiates Brotli and gzip for a manifest-listed bundle", async () => {
  const entry = largestManifestEntry();
  const file = resolve(root, `dist/client${entry.path}`);
  const source = await readFile(file);
  const brotliSidecar = await readFile(`${file}.br`);
  const gzipSidecar = await readFile(`${file}.gz`);
  const expectedEtag = contentEtag(source);

  const brotli = await rawRequest(entry.path, { "Accept-Encoding": "br" });
  assert.equal(brotli.statusCode, 200);
  assert.equal(brotli.headers["content-encoding"], "br");
  assert.equal(brotli.headers.etag, expectedEtag);
  assert.match(brotli.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
  assert.deepEqual(brotli.body, brotliSidecar);
  assert.deepEqual(brotliDecompressSync(brotli.body), source);

  const gzip = await rawRequest(entry.path, { "Accept-Encoding": "gzip" });
  assert.equal(gzip.statusCode, 200);
  assert.equal(gzip.headers["content-encoding"], "gzip");
  assert.equal(gzip.headers.etag, expectedEtag);
  assert.deepEqual(gzip.body, gzipSidecar);
  assert.deepEqual(gunzipSync(gzip.body), source);

  const preferredGzip = await rawRequest(entry.path, {
    "Accept-Encoding": "br;q=0.5, gzip;q=1"
  });
  assert.equal(preferredGzip.headers["content-encoding"], "gzip");
  assert.deepEqual(preferredGzip.body, gzipSidecar);

  const preferredIdentity = await rawRequest(entry.path, {
    "Accept-Encoding": "br;q=0.5, identity;q=1"
  });
  assert.equal(preferredIdentity.headers["content-encoding"], undefined);
  assert.deepEqual(preferredIdentity.body, source);

  const identity = await rawRequest(entry.path, { "Accept-Encoding": "identity" });
  assert.equal(identity.statusCode, 200);
  assert.equal(identity.headers["content-encoding"], undefined);
  assert.equal(identity.headers.etag, expectedEtag);
  assert.deepEqual(identity.body, source);
});

test("preserves search-asset headers for HEAD and conditional requests", async () => {
  const entry = largestManifestEntry();
  const file = resolve(root, `dist/client${entry.path}`);
  const sidecar = await readFile(`${file}.br`);
  const expectedEtag = contentEtag(await readFile(file));
  const head = await rawRequest(
    entry.path,
    { "Accept-Encoding": "br" },
    "HEAD"
  );

  assert.equal(head.statusCode, 200);
  assert.equal(head.body.byteLength, 0);
  assert.equal(head.headers["content-encoding"], "br");
  assert.equal(Number(head.headers["content-length"]), sidecar.byteLength);
  assert.equal(head.headers.etag, expectedEtag);
  assert.match(head.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
  assert.match(head.headers["cache-control"] || "", /\bimmutable\b/);

  const conditional = await rawRequest(entry.path, {
    "Accept-Encoding": "br",
    "If-None-Match": expectedEtag
  });
  assert.equal(conditional.statusCode, 304);
  assert.equal(conditional.body.byteLength, 0);
  assert.equal(conditional.headers.etag, expectedEtag);
  assert.match(conditional.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
  assert.match(conditional.headers["cache-control"] || "", /\bimmutable\b/);
});

test("only gives immutable caching to content-hashed bundles", async () => {
  const entry = largestManifestEntry();
  const response = await rawRequest(entry.path, { "Accept-Encoding": "gzip" });
  const cacheControl = response.headers["cache-control"] || "";
  const isHashed = /(?:^|[.-])[a-f0-9]{12,64}\.json$/i.test(entry.path.split("/").at(-1));

  if (isHashed) {
    assert.match(cacheControl, /\bmax-age=31536000\b/);
    assert.match(cacheControl, /\bimmutable\b/);
  } else {
    assert.match(cacheControl, /\bmax-age=0\b/);
    assert.doesNotMatch(cacheControl, /\bimmutable\b/);
  }

  const conditional = await rawRequest(entry.path, {
    "Accept-Encoding": "gzip",
    "If-None-Match": response.headers.etag
  });
  assert.equal(conditional.statusCode, 304);
  assert.equal(conditional.body.byteLength, 0);
  assert.match(conditional.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
});

test("does not apply index cache headers to missing paths", async () => {
  const response = await rawRequest("/search-index/not-in-the-manifest.123456789abc.json", {
    "Accept-Encoding": "br"
  });

  assert.equal(response.statusCode, 404);
  assert.doesNotMatch(response.headers["cache-control"] || "", /\bimmutable\b/);
});

function largestManifestEntry() {
  return manifest.entries
    .filter((entry) => entry.status === "supported")
    .sort((left, right) => right.recordCount - left.recordCount)[0];
}

async function builtAssetPath(extension) {
  const assetDirectory = resolve(root, "dist/client/_astro");
  const names = await readdir(assetDirectory);
  const name = names.find((candidate) => candidate.endsWith(extension));
  assert.ok(name, `Expected a built ${extension} asset`);
  return `/_astro/${name}`;
}

async function findJsonFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (app.child.exitCode !== null) {
      throw new Error(`Production server exited before startup:\n${app.logs.join("")}`);
    }
    try {
      const response = await rawRequest("/");
      if (response.statusCode === 200) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out starting production server:\n${app.logs.join("")}`);
}

async function availablePort() {
  return await new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function rawRequest(pathname, headers = {}, method = "GET") {
  const url = new URL(pathname, baseUrl);
  return await new Promise((resolveResponse, reject) => {
    const pending = request(
      url,
      {
        headers,
        method
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolveResponse({
            statusCode: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    pending.once("error", reject);
    pending.end();
  });
}

function contentEtag(bytes) {
  const digest = createHash("sha256").update(bytes).digest("base64url");
  return `W/"sha256-${digest}"`;
}
