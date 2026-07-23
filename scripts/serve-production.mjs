import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { constants as zlibConstants } from "node:zlib";
import compression from "compression";
import serveStatic from "serve-static";

const clientDirectory = resolve(fileURLToPath(new URL("../dist/client/", import.meta.url)));
const manifestFile = resolve(clientDirectory, "search-index/manifest.json");
const searchAssets = await loadSearchAssets();
const staticFiles = serveStatic(clientDirectory, {
  index: false,
  setHeaders: setStaticHeaders
});
const compressSearchIndex = compression({
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
  const pathname = requestPathname(request);
  const serve = () => {
    staticFiles(request, response, (error) => {
      if (error) {
        sendServerError(response, error);
        return;
      }
      void renderAstro(request, response);
    });
  };

  if (!searchAssets.byUrl.has(pathname)) {
    serve();
    return;
  }

  compressSearchIndex(request, response, (error) => {
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
    response.setHeader("ETag", searchAsset.etag);
    response.setHeader("Vary", "Accept-Encoding");
    response.setHeader(
      "Cache-Control",
      searchAsset.cache === "immutable"
        ? "public, max-age=31536000, immutable"
        : searchAsset.cache === "manifest"
          ? "no-cache, must-revalidate"
          : "public, max-age=0, must-revalidate"
    );
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

  const byUrl = new Map();
  const byFile = new Map();
  addAsset("/search-index/manifest.json", manifestBytes, "manifest");

  for (const entry of manifest.entries) {
    if (entry?.status !== "supported") continue;
    if (!entry || typeof entry.path !== "string" || !isSafeSearchIndexPath(entry.path)) {
      throw new Error(`Invalid search-index path in manifest: ${String(entry?.path)}`);
    }
    const filePath = filePathForUrl(entry.path);
    const bytes = await readFile(filePath);
    const cache = hasContentHash(entry.path) ? "immutable" : "revalidate";
    addAsset(entry.path, bytes, cache);
  }

  return { byUrl, byFile };

  function addAsset(urlPath, bytes, cache) {
    const filePath = filePathForUrl(urlPath);
    const asset = {
      cache,
      etag: weakContentEtag(bytes)
    };
    byUrl.set(urlPath, asset);
    byFile.set(filePath, asset);
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
