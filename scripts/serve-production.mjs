import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { constants as zlibConstants } from "node:zlib";
import compression from "compression";
import serveStatic from "serve-static";

const clientDirectory = resolve(fileURLToPath(new URL("../dist/client/", import.meta.url)));
const manifestFile = resolve(clientDirectory, "search-index/manifest.json");
const runtimeManifestFile = resolve(
  clientDirectory,
  "search-index/runtime-manifest.json"
);
const searchAssets = await loadSearchAssets();
const staticFiles = serveStatic(clientDirectory, {
  index: false,
  setHeaders: setStaticHeaders
});
const compressResponses = compression({
  threshold: 0,
  level: 6,
  brotli: {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 5
    }
  }
});
const { handler: renderAstro } = await import("../dist/server/entry.mjs");

const host = process.env.HOST || "0.0.0.0";
const port = parsePort(process.env.PORT);
const server = createServer(handleRequest);

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`Production server listening on http://${host}:${actualPort}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close((error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    });
  });
}

function handleRequest(request, response) {
  const searchAsset = searchAssets.byUrl.get(requestPathname(request));
  const sidecar =
    searchAsset && !request.headers.range
      ? selectPrecompressedRepresentation(
          request.headers["accept-encoding"],
          searchAsset
        )
      : undefined;
  if (
    sidecar &&
    (request.method === undefined ||
      request.method === "GET" ||
      request.method === "HEAD")
  ) {
    servePrecompressed(request, response, searchAsset, sidecar);
    return;
  }

  const serve = () => {
    staticFiles(request, response, (error) => {
      if (error) {
        sendServerError(response, error);
        return;
      }
      void renderAstro(request, response);
    });
  };

  compressResponses(request, response, (error) => {
    if (error) {
      sendServerError(response, error);
      return;
    }
    serve();
  });
}

function setStaticHeaders(response, filePath) {
  const normalizedPath = resolve(filePath);
  const searchAsset = searchAssets.byFile.get(normalizedPath);
  if (searchAsset) {
    setSearchAssetHeaders(response, searchAsset);
    return;
  }

  const astroAssetDirectory = resolve(clientDirectory, "_astro");
  if (normalizedPath.startsWith(`${astroAssetDirectory}${sep}`)) {
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
}

async function loadSearchAssets() {
  const manifestBytes = await readFile(manifestFile);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (!Array.isArray(manifest.entries)) {
    throw new Error("Search-index manifest must contain an entries array.");
  }

  const byFile = new Map();
  const byUrl = new Map();
  await addAsset(
    "/search-index/manifest.json",
    weakContentEtag(manifestBytes),
    "manifest"
  );
  const runtimeManifestBytes = await readOptionalFile(runtimeManifestFile);
  if (runtimeManifestBytes) {
    await addAsset(
      "/search-index/runtime-manifest.json",
      weakContentEtag(runtimeManifestBytes),
      "manifest"
    );
  }

  for (const entry of manifest.entries) {
    if (entry?.status !== "supported") continue;
    if (!entry || typeof entry.path !== "string" || !isSafeSearchIndexPath(entry.path)) {
      throw new Error(`Invalid search-index path in manifest: ${String(entry?.path)}`);
    }
    if (!/^[a-f0-9]{64}$/i.test(entry.outputSha256 ?? "")) {
      throw new Error(`Invalid search-index hash in manifest: ${String(entry.outputSha256)}`);
    }
    const cache = hasContentHash(entry.path) ? "immutable" : "revalidate";
    await addAsset(entry.path, weakSha256Etag(entry.outputSha256), cache);
  }

  return { byFile, byUrl };

  async function addAsset(urlPath, etag, cache) {
    const filePath = filePathForUrl(urlPath);
    const [sourceStats, brotli, gzip] = await Promise.all([
      stat(filePath),
      loadSidecar(filePath, "br"),
      loadSidecar(filePath, "gzip")
    ]);
    const asset = {
      cache,
      etag,
      lastModified: sourceStats.mtime,
      representations: { br: brotli, gzip }
    };
    byFile.set(filePath, asset);
    byUrl.set(urlPath, asset);
  }
}

async function loadSidecar(filePath, encoding) {
  const extension = encoding === "br" ? ".br" : ".gz";
  const sidecarPath = `${filePath}${extension}`;
  try {
    const sidecarStats = await stat(sidecarPath);
    return {
      encoding,
      filePath: sidecarPath,
      size: sidecarStats.size
    };
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function filePathForUrl(urlPath) {
  const filePath = resolve(clientDirectory, `.${urlPath}`);
  if (!filePath.startsWith(`${clientDirectory}${sep}`)) {
    throw new Error(`Search-index path escapes the client directory: ${urlPath}`);
  }
  return filePath;
}

function isSafeSearchIndexPath(urlPath) {
  return /^\/search-index\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.json$/i.test(urlPath);
}

function hasContentHash(urlPath) {
  return /(?:^|[.-])[a-f0-9]{12,64}\.json$/i.test(basename(urlPath));
}

function weakContentEtag(bytes) {
  const digest = createHash("sha256").update(bytes).digest("base64url");
  return `W/"sha256-${digest}"`;
}

function weakSha256Etag(hexDigest) {
  return `W/"sha256-${Buffer.from(hexDigest, "hex").toString("base64url")}"`;
}

function selectPrecompressedRepresentation(acceptEncoding, asset) {
  if (typeof acceptEncoding !== "string") return undefined;
  const qualities = new Map();
  for (const item of acceptEncoding.split(",")) {
    const [rawEncoding, ...parameters] = item.trim().toLowerCase().split(";");
    if (!rawEncoding) continue;
    let quality = 1;
    for (const parameter of parameters) {
      const match = /^\s*q\s*=\s*(\d(?:\.\d+)?)\s*$/.exec(parameter);
      if (match) quality = Math.min(1, Number(match[1]));
    }
    qualities.set(rawEncoding, Math.max(qualities.get(rawEncoding) ?? 0, quality));
  }

  const wildcardQuality = qualities.get("*") ?? 0;
  const preferred = ["br", "gzip"]
    .map((encoding) => ({
      encoding,
      quality: qualities.get(encoding) ?? wildcardQuality,
      representation: asset.representations[encoding]
    }))
    .filter(({ quality, representation }) => quality > 0 && representation)
    .sort((left, right) => right.quality - left.quality)[0];
  const identityQuality = qualities.get("identity");
  return identityQuality !== undefined &&
    identityQuality > (preferred?.quality ?? 0)
    ? undefined
    : preferred?.representation;
}

function servePrecompressed(request, response, asset, representation) {
  setSearchAssetHeaders(response, asset);
  response.setHeader("Last-Modified", asset.lastModified.toUTCString());

  if (isFreshRequest(request, asset)) {
    response.statusCode = 304;
    response.end();
    return;
  }

  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Encoding", representation.encoding);
  response.setHeader("Content-Length", representation.size);
  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(representation.filePath);
  stream.once("error", (error) => {
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    response.removeHeader("Content-Encoding");
    response.removeHeader("Content-Length");
    sendServerError(response, error);
  });
  response.once("close", () => stream.destroy());
  stream.pipe(response);
}

function setSearchAssetHeaders(response, asset) {
  response.setHeader("ETag", asset.etag);
  response.setHeader("Vary", "Accept-Encoding");
  response.setHeader(
    "Cache-Control",
    asset.cache === "immutable"
      ? "public, max-age=31536000, immutable"
      : asset.cache === "manifest"
        ? "no-cache, must-revalidate"
        : "public, max-age=0, must-revalidate"
  );
}

function isFreshRequest(request, asset) {
  const ifNoneMatch = request.headers["if-none-match"];
  if (typeof ifNoneMatch === "string") {
    const expected = withoutWeakPrefix(asset.etag);
    return ifNoneMatch
      .split(",")
      .some((candidate) => {
        const trimmed = candidate.trim();
        return trimmed === "*" || withoutWeakPrefix(trimmed) === expected;
      });
  }

  const ifModifiedSince = request.headers["if-modified-since"];
  if (typeof ifModifiedSince !== "string") return false;
  const modifiedSince = Date.parse(ifModifiedSince);
  return (
    Number.isFinite(modifiedSince) &&
    Math.floor(asset.lastModified.getTime() / 1000) * 1000 <= modifiedSince
  );
}

function withoutWeakPrefix(etag) {
  return etag.startsWith("W/") ? etag.slice(2) : etag;
}

function requestPathname(request) {
  try {
    return new URL(request.url || "/", "http://localhost").pathname;
  } catch {
    return "/";
  }
}

function parsePort(value) {
  if (value === undefined) return 8080;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error(`Invalid PORT: ${value}`);
  }
  return parsed;
}

function sendServerError(response, error) {
  console.error(error);
  if (!response.headersSent) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
  }
  response.end("Internal Server Error");
}
