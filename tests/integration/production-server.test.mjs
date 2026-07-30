import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { request } from "node:http";
import net from "node:net";
import { resolve } from "node:path";
import { after, before, test } from "node:test";

const root = resolve(import.meta.dirname, "../..");
let app;
let baseUrl;

before(async () => {
  const port = await availablePort();
  const logs = [];
  const child = spawn(
    process.execPath,
    [
      "node_modules/astro/bin/astro.mjs",
      "preview",
      "--host",
      "127.0.0.1",
      "--port",
      String(port)
    ],
    {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  app = { child, logs };
  baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer();
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

test("serves the Workers SSR build with its bundled catalog", async () => {
  const response = await rawRequest("/");

  assert.equal(response.statusCode, 200);
  assert.match(response.body.toString("utf8"), /data-search-form/);
  assert.doesNotMatch(app.logs.join(""), /ENOENT|docs-sources\.toml/);
});

test("serves localized home metadata without indexing search-state URLs", async () => {
  const english = await rawRequest("/?ui=en", {
    "Accept-Language": "ja-JP,ja;q=0.9"
  });
  const englishHtml = english.body.toString("utf8");

  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(
    englishHtml,
    /<title>LangRef Search — Official Programming Documentation Search<\/title>/
  );
  assert.match(
    englishHtml,
    /<link rel="canonical" href="https:\/\/langref-search\.popyson\.com\/\?ui=en">/
  );
  assert.match(
    englishHtml,
    /<link rel="alternate" hreflang="ja" href="https:\/\/langref-search\.popyson\.com\/\?ui=ja">/
  );
  assert.match(
    englishHtml,
    /<meta name="robots" content="index,follow,max-image-preview:large">/
  );
  assert.match(englishHtml, /<meta property="og:site_name" content="LangRef Search">/);
  assert.match(
    englishHtml,
    /<meta property="og:image" content="https:\/\/langref-search\.popyson\.com\/ogp\.png">/
  );
  assert.doesNotMatch(englishHtml, /fonts\.gstatic\.com/);
  assert.match(english.headers.vary || "", /\bAccept-Language\b/i);
  assert.match(english.headers.vary || "", /\bCookie\b/i);

  const japanese = await rawRequest("/?ui=ja");
  const japaneseHtml = japanese.body.toString("utf8");
  assert.match(japaneseHtml, /<html[^>]+lang="ja"/);
  assert.match(
    japaneseHtml,
    /<title>LangRef Search — プログラミング公式ドキュメント検索<\/title>/
  );

  const search = await rawRequest("/?q=python+list&ui=en");
  assert.match(
    search.body.toString("utf8"),
    /<meta name="robots" content="noindex,follow">/
  );
});

test("uses Accept-Language only when URL and saved preferences are absent", async () => {
  const japanese = await rawRequest("/", {
    "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8"
  });
  assert.match(japanese.body.toString("utf8"), /<html[^>]+lang="ja"/);

  const savedEnglish = await rawRequest("/", {
    "Accept-Language": "ja-JP,ja;q=0.9",
    Cookie: "ods_ui=en"
  });
  assert.match(savedEnglish.body.toString("utf8"), /<html[^>]+lang="en"/);
});

test("renders saved theme settings before the first paint", async () => {
  const darkHtml = (
    await rawRequest("/", { Cookie: "ods_theme=dark" })
  ).body.toString("utf8");
  assert.match(darkHtml, /<html[^>]+data-theme-setting="dark"/);
  assert.match(darkHtml, /<meta name="color-scheme" content="only dark">/);

  const lightHtml = (
    await rawRequest("/", { Cookie: "ods_theme=light" })
  ).body.toString("utf8");
  assert.match(lightHtml, /<html[^>]+data-theme-setting="light"/);
  assert.match(lightHtml, /<meta name="color-scheme" content="only light">/);
});

test("publishes robots, sitemap, and optimized brand assets", async () => {
  const robots = await rawRequest("/robots.txt");
  assert.equal(robots.statusCode, 200);
  assert.match(robots.body.toString("utf8"), /Sitemap: https:\/\/langref-search\.popyson\.com\/sitemap\.xml/);

  const sitemap = await rawRequest("/sitemap.xml");
  const sitemapXml = sitemap.body.toString("utf8");
  assert.equal(sitemap.statusCode, 200);
  assert.match(sitemapXml, /<loc>https:\/\/langref-search\.popyson\.com\/<\/loc>/);
  assert.doesNotMatch(sitemapXml, /\/(?:terms|privacy)/);

  for (const asset of [
    "/icon.png",
    "/ogp.png",
    "/favicon.png",
    "/apple-touch-icon.png"
  ]) {
    const response = await rawRequest(asset);
    assert.equal(response.statusCode, 200, asset);
    assert.match(response.headers["content-type"] || "", /^image\/png\b/, asset);
  }

  const wordmark = await rawRequest("/logo_svg.svg");
  assert.equal(wordmark.statusCode, 200);
  assert.match(wordmark.headers["content-type"] || "", /^image\/svg\+xml\b/);
  assert.match(wordmark.body.toString("utf8"), /^<svg [^>]*viewBox="/);
});

test("links the footer and renders both legal languages", async () => {
  const home = (await rawRequest("/?ui=en")).body.toString("utf8");
  assert.match(home, /href="\/terms\?ui=en"/);
  assert.match(home, /href="\/privacy\?ui=en"/);
  assert.match(home, /href="https:\/\/forms\.gle\/WHDXAprmCmmu9M957"/);
  assert.match(home, /href="https:\/\/x\.com\/popyson1648"/);
  assert.match(home, />popyson1648<\/a>/);
  assert.match(home, /rel="external noopener noreferrer"/);

  const englishPrivacy = (
    await rawRequest("/privacy?ui=en")
  ).body.toString("utf8");
  assert.match(englishPrivacy, /<html[^>]+lang="en"/);
  assert.match(englishPrivacy, /<meta name="robots" content="noindex,follow">/);
  for (const service of ["Claude", "Claude Code", "ChatGPT", "Codex", "Antigravity"]) {
    assert.match(englishPrivacy, new RegExp(service));
  }
  assert.match(englishPrivacy, /12 months after resolution/);
  assert.match(englishPrivacy, /no later than 24 months/);
  assert.match(englishPrivacy, /Shunsuke Setoguchi/);
  assert.doesNotMatch(legalArticle(englishPrivacy), /x\.com\/popyson1648/);
  assert.match(englishPrivacy, /Automatic Transmission to Third Parties/);
  assert.match(
    englishPrivacy,
    /embeds no analytics, advertising, measurement, error-tracking, or other third-party tags or SDKs/
  );

  const englishTerms = (await rawRequest("/terms?ui=en")).body.toString("utf8");
  assert.match(
    englishTerms,
    /Document bodies are never copied, stored, or redistributed/
  );
  const japanesePrivacy = (
    await rawRequest("/privacy?ui=ja")
  ).body.toString("utf8");
  assert.match(japanesePrivacy, /<h3>第三者への自動送信<\/h3>/);

  const japaneseTerms = (
    await rawRequest("/terms?ui=ja")
  ).body.toString("utf8");
  assert.match(japaneseTerms, /<html[^>]+lang="ja"/);
  assert.match(japaneseTerms, /<h1>利用規約<\/h1>/);
  assert.match(japaneseTerms, /Shunsuke Setoguchi/);
  assert.doesNotMatch(legalArticle(japaneseTerms), /x\.com\/popyson1648/);
  assert.match(japaneseTerms, /文書本文は複製、保存または再配信しません。/);
});

test("serves self-hosted fonts and immutable application assets", async () => {
  const fontName = (
    await readFile(resolve(root, "src/font-faces.css"), "utf8")
  ).match(/url\(\/fonts\/google\/([^)]+\.woff2)\)/)?.[1];
  assert.ok(fontName);

  const font = await rawRequest(`/fonts/google/${fontName}`);
  assert.equal(font.statusCode, 200);
  assert.match(font.headers["content-type"] || "", /^font\/woff2\b/);
  assert.match(font.headers["cache-control"] || "", /\bmax-age=31536000\b/);
  assert.match(font.headers["cache-control"] || "", /\bimmutable\b/);
  assert.equal(font.body.subarray(0, 4).toString("ascii"), "wOF2");

  const html = (await rawRequest("/")).body.toString("utf8");
  const assetPath = /(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/.exec(html)?.[1];
  assert.ok(assetPath);
  const asset = await rawRequest(assetPath);
  assert.equal(asset.statusCode, 200);
  assert.match(asset.headers["cache-control"] || "", /\bimmutable\b/);
});

test("declares a cache policy for documents, bundles, and manifests", async () => {
  for (const document of ["/?ui=en", "/terms?ui=ja", "/privacy?ui=en"]) {
    const response = await rawRequest(document);
    assert.equal(response.statusCode, 200, document);
    assert.equal(
      response.headers["cache-control"],
      "private, no-cache",
      document
    );
    assert.match(response.headers.vary || "", /\bCookie\b/i, document);
  }

  const robots = await rawRequest("/robots.txt");
  assert.equal(robots.headers["cache-control"], undefined);

  const runtimeManifest = await rawRequest("/search-index/runtime-manifest.json");
  assert.equal(runtimeManifest.statusCode, 200);
  assert.doesNotMatch(runtimeManifest.headers["cache-control"] || "", /\bimmutable\b/);

  const supported = JSON.parse(runtimeManifest.body.toString("utf8")).entries.filter(
    (entry) => typeof entry.path === "string"
  );
  assert.ok(supported.length > 0);
  for (const entry of supported) {
    assert.match(entry.path, /^\/search-index\/bundles\//);
  }

  const bundle = await rawRequest(supported[0].path);
  assert.equal(bundle.statusCode, 200);
  assert.match(bundle.headers["cache-control"] || "", /\bmax-age=31536000\b/);
  assert.match(bundle.headers["cache-control"] || "", /\bimmutable\b/);
});

test("does not apply immutable headers to missing static paths", async () => {
  const response = await rawRequest("/fonts/google/not-found.woff2");
  assert.equal(response.statusCode, 404);
  assert.doesNotMatch(response.headers["cache-control"] || "", /\bimmutable\b/);
});

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (app.child.exitCode !== null) {
      throw new Error(`Workers preview exited before startup:\n${app.logs.join("")}`);
    }
    try {
      const response = await rawRequest("/");
      if (response.statusCode === 200) return;
    } catch {
      // The Workers preview is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`Timed out starting Workers preview:\n${app.logs.join("")}`);
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

/* The legal text itself names the operator without linking a social profile;
   the shared site footer below it still carries that link. */
function legalArticle(html) {
  return html.split("<footer")[0];
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
