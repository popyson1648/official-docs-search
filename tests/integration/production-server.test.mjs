import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request } from "node:http";
import net from "node:net";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "../..");
const manifestFile = resolve(root, "dist/client/search-index/manifest.json");
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

test("serves the manifest compressed with stable revalidation headers", async () => {
  const source = await readFile(manifestFile);
  const response = await rawRequest("/search-index/manifest.json", {
    "Accept-Encoding": "br"
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-encoding"], "br");
  assert.match(response.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
  assert.match(response.headers["cache-control"] || "", /\bno-cache\b/);
  assert.equal(response.headers.etag, contentEtag(source));
  assert.deepEqual(brotliDecompressSync(response.body), source);

  const conditional = await rawRequest("/search-index/manifest.json", {
    "Accept-Encoding": "br",
    "If-None-Match": response.headers.etag
  });
  assert.equal(conditional.statusCode, 304);
  assert.equal(conditional.body.byteLength, 0);
});

test("negotiates Brotli and gzip for a manifest-listed bundle", async () => {
  const entry = largestManifestEntry();
  const file = resolve(root, `dist/client${entry.path}`);
  const source = await readFile(file);
  const expectedEtag = contentEtag(source);

  const brotli = await rawRequest(entry.path, { "Accept-Encoding": "br" });
  assert.equal(brotli.statusCode, 200);
  assert.equal(brotli.headers["content-encoding"], "br");
  assert.equal(brotli.headers.etag, expectedEtag);
  assert.match(brotli.headers.vary || "", /(?:^|,)\s*Accept-Encoding\s*(?:,|$)/i);
  assert.deepEqual(brotliDecompressSync(brotli.body), source);

  const gzip = await rawRequest(entry.path, { "Accept-Encoding": "gzip" });
  assert.equal(gzip.statusCode, 200);
  assert.equal(gzip.headers["content-encoding"], "gzip");
  assert.equal(gzip.headers.etag, expectedEtag);
  assert.deepEqual(gunzipSync(gzip.body), source);

  const identity = await rawRequest(entry.path, { "Accept-Encoding": "identity" });
  assert.equal(identity.statusCode, 200);
  assert.equal(identity.headers["content-encoding"], undefined);
  assert.equal(identity.headers.etag, expectedEtag);
  assert.deepEqual(identity.body, source);
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

async function rawRequest(pathname, headers = {}) {
  const url = new URL(pathname, baseUrl);
  return await new Promise((resolveResponse, reject) => {
    const pending = request(
      url,
      {
        headers
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
