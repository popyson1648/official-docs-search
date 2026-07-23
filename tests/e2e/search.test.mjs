import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";
import puppeteer from "puppeteer";

const root = resolve(import.meta.dirname, "../..");
let app;
let browser;

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

async function startApp() {
  const port = await availablePort();
  const logs = [];
  const child = spawn(
    process.execPath,
    ["scripts/serve-production.mjs"],
    {
      cwd: root,
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Production server exited before startup:\n${logs.join("")}`);
    try {
      if ((await fetch(baseUrl)).ok) return { child, baseUrl, logs };
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  child.kill("SIGTERM");
  throw new Error(`Timed out starting the production server:\n${logs.join("")}`);
}

async function stopApp(instance) {
  if (!instance || instance.child.exitCode !== null) return;
  instance.child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolveExit) => instance.child.once("exit", () => resolveExit(true))),
    new Promise((resolveDelay) => setTimeout(() => resolveDelay(false), 3_000))
  ]);
  if (!exited && instance.child.exitCode === null) instance.child.kill("SIGKILL");
}

async function newPage({ width = 1280, height = 900 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: width <= 480, hasTouch: width <= 480 });
  return page;
}

async function gotoQuery(page, query, extras = "") {
  await page.goto(`${app.baseUrl}/?q=${encodeURIComponent(query)}&ui=en${extras}`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000
  });
}

async function waitForResults(page) {
  await page.waitForSelector('[data-search-status][data-state="success"]', { timeout: 20_000 });
  await page.waitForSelector(".result-item h2 a", { timeout: 20_000 });
}

async function snapshot(page) {
  return await page.evaluate(() => ({
    state: document.querySelector("[data-search-status]")?.dataset.state,
    languages: [...document.querySelectorAll(".result-item")].map((item) => item.dataset.language),
    sources: [...document.querySelectorAll(".result-item")].map((item) => item.dataset.sourceId),
    locales: [...document.querySelectorAll(".result-item")].map((item) => item.dataset.docsLocale),
    links: [...document.querySelectorAll(".result-item h2 a")].map((link) => ({
      href: link.href,
      target: link.target,
      rel: link.rel
    }))
  }));
}

async function clickAndWaitForNavigation(page, selector) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20_000 }),
    page.$eval(selector, (element) => element.click())
  ]);
}

before(async () => {
  app = await startApp();
  browser = await puppeteer.launch();
});

after(async () => {
  await browser?.close();
  await stopApp(app);
});

test("initial page, help, validation, and language tags work", async () => {
  const page = await newPage();
  await page.goto(app.baseUrl, { waitUntil: "domcontentloaded" });
  assert.equal(await page.$("[data-search-results]"), null);

  await page.click("[data-help-open]");
  assert.equal(await page.$eval("[data-help-dialog]", (dialog) => dialog.open), true);

  await gotoQuery(page, "python");
  assert.match(await page.$eval(".notice.error", (notice) => notice.textContent), /Enter search words/);

  await gotoQuery(page, "python,rust iterator");
  assert.deepEqual(
    await page.$$eval("[data-remove-tag]", (buttons) => buttons.map((button) => button.dataset.removeTag)),
    ["python", "rust"]
  );
  await clickAndWaitForNavigation(page, '[data-remove-tag="python"]');
  assert.equal(new URL(page.url()).searchParams.get("q"), "rust iterator");
  await page.close();
});

test("single-language official search returns real linked results in new tabs", async () => {
  const page = await newPage();
  await gotoQuery(page, "python list", "&docsLocale=en");
  await waitForResults(page);
  const result = await snapshot(page);

  assert.equal(result.state, "success");
  assert.ok(result.links.length > 0);
  assert.ok(result.languages.every((language) => language === "python"));
  assert.ok(result.links.every((link) => new URL(link.href).hostname === "docs.python.org"));
  assert.ok(result.links.every((link) => link.target === "_blank" && link.rel.includes("noopener")));
  await page.close();
});

test("query and search-index strings render as text without executing markup", async () => {
  const page = await newPage();
  const searchPayload =
    'safety </input><img id="query-xss" src=x onerror="globalThis.__odsXss=1">';
  const queryPayload = `python ${searchPayload}`;
  const titlePayload =
    `${searchPayload} </a><img id="title-xss" src=x onerror="globalThis.__odsXss=1">`;
  const sourcePayload =
    'Python </span><img id="source-xss" src=x onerror="globalThis.__odsXss=1">';
  const localePayload =
    'en"><img id="locale-xss" src=x onerror="globalThis.__odsXss=1">';
  const urlSuffix =
    'safe.html?next="><img id="url-xss" src=x onerror="globalThis.__odsXss=1">';
  const manifest = {
    schemaVersion: 2,
    generatorVersion: "security-fixture",
    catalogSha256: "security-fixture",
    entries: [
      {
        sourceId: "python-docs",
        sourceName: sourcePayload,
        sourceKind: "official",
        programmingLanguage: "python",
        docsLocale: localePayload,
        status: "supported",
        path: "/search-index/security.fixture.json",
        recordCount: 1
      }
    ]
  };
  const bundle = {
    schemaVersion: 2,
    sourceId: "python-docs",
    docsLocale: localePayload,
    urlPrefix: "https://docs.python.org/3/",
    records: [[titlePayload, urlSuffix]]
  };

  await page.evaluateOnNewDocument(() => {
    globalThis.__odsXss = 0;
  });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/search-index/manifest.json") {
      await request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(manifest)
      });
    } else if (pathname === "/search-index/security.fixture.json") {
      await request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(bundle)
      });
    } else {
      await request.continue();
    }
  });

  await gotoQuery(page, queryPayload);
  await waitForResults(page);
  const rendered = await page.evaluate(() => {
    const link = document.querySelector(".result-item h2 a");
    return {
      executed: globalThis.__odsXss,
      injectedElements: [
        "query-xss",
        "title-xss",
        "source-xss",
        "locale-xss",
        "url-xss"
      ].filter((id) => document.getElementById(id)),
      queryValue: document.querySelector("[data-query-input]")?.value,
      highlightText: document.querySelector("[data-query-highlight]")?.textContent,
      title: link?.textContent,
      href: link?.href,
      meta: document.querySelector(".result-meta")?.textContent,
      visibleUrl: document.querySelector(".result-url")?.textContent
    };
  });

  assert.equal(rendered.executed, 0);
  assert.deepEqual(rendered.injectedElements, []);
  assert.equal(rendered.queryValue, queryPayload);
  assert.equal(rendered.highlightText, queryPayload);
  assert.equal(rendered.title, titlePayload);
  assert.match(rendered.meta, new RegExp(sourcePayload.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(
    rendered.meta,
    new RegExp(localePayload.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
  assert.equal(new URL(rendered.href).protocol, "https:");
  assert.match(rendered.visibleUrl, /%22%3E%3Cimg/);
  await page.close();
});

test("one multi-language query returns results for every selected language", async () => {
  const page = await newPage();
  await gotoQuery(page, "python,rust iterator", "&docsLocale=en");
  await waitForResults(page);
  const result = await snapshot(page);

  assert.deepEqual(new Set(result.languages), new Set(["python", "rust"]));
  assert.deepEqual(
    new Set(result.links.map((link) => new URL(link.href).hostname)),
    new Set(["docs.python.org", "doc.rust-lang.org"])
  );
  await page.close();
});

test("enabling and disabling a non-official source changes the result list", async () => {
  const page = await newPage();
  await gotoQuery(page, "javascript proxy", "&docsLocale=en");
  await waitForResults(page);
  assert.ok((await snapshot(page)).sources.every((source) => source === "tc39-ecma262"));

  await clickAndWaitForNavigation(page, "[data-source-toggle]");
  await waitForResults(page);
  assert.ok((await snapshot(page)).sources.includes("mdn-js"));

  await clickAndWaitForNavigation(page, "[data-source-toggle]");
  await waitForResults(page);
  assert.equal((await snapshot(page)).sources.includes("mdn-js"), false);

  await clickAndWaitForNavigation(page, "[data-source-toggle]");
  await waitForResults(page);
  assert.ok((await snapshot(page)).sources.includes("mdn-js"));

  await page.$eval("details.source-details", (details) => { details.open = true; });
  await page.$eval('input[name="sourceId"][value="mdn-js"]', (input) => { input.checked = false; });
  await clickAndWaitForNavigation(page, '.search-group button[type="submit"]');
  await waitForResults(page);
  assert.equal((await snapshot(page)).sources.includes("mdn-js"), false);
  await page.close();
});

test("documentation locale and UI locale switch independently", async () => {
  const page = await newPage();
  await gotoQuery(page, "python list", "&docsLocale=en");
  await waitForResults(page);
  assert.ok((await snapshot(page)).locales.every((locale) => locale === "en"));

  await clickAndWaitForNavigation(page, '[data-docs-radio][value="ja"]');
  await waitForResults(page);
  let result = await snapshot(page);
  assert.ok(result.locales.every((locale) => locale === "ja"));
  assert.ok(result.links.every((link) => new URL(link.href).pathname.startsWith("/ja/")));

  await page.$eval('[data-ui-radio][value="ja"]', (radio) => radio.click());
  assert.equal(await page.$eval("html", (html) => html.lang), "ja");
  result = await snapshot(page);
  assert.ok(result.locales.every((locale) => locale === "ja"));
  await page.close();
});

test("planned sources are explicit while supported sources still return results", async () => {
  const page = await newPage();
  await gotoQuery(page, "go Reader", "&docsLocale=en");
  await waitForResults(page);
  const coverage = await page.$eval("[data-index-coverage]", (element) => ({
    hidden: element.hidden,
    text: element.textContent
  }));
  assert.equal(coverage.hidden, false);
  assert.match(coverage.text, /Go Documentation/);
  assert.match(coverage.text, /index planned/);
  assert.ok((await snapshot(page)).sources.includes("go-std"));
  await page.close();
});

test("new TypeScript and C# indexes participate in one combined search", async () => {
  const page = await newPage();
  await gotoQuery(page, "typescript,csharp generics", "&docsLocale=en");
  await waitForResults(page);
  const result = await snapshot(page);

  assert.deepEqual(new Set(result.languages), new Set(["typescript", "csharp"]));
  assert.deepEqual(
    new Set(result.links.map((link) => new URL(link.href).hostname)),
    new Set(["www.typescriptlang.org", "learn.microsoft.com"])
  );
  await page.close();
});

test("new PHP and Ruby indexes expose their Japanese documentation locale", async () => {
  for (const [query, source, hostname] of [
    ["php array_map", "php-manual", "www.php.net"],
    ["ruby Enumerable", "ruby-docs", "docs.ruby-lang.org"]
  ]) {
    const page = await newPage();
    await gotoQuery(page, query, "&docsLocale=ja");
    await waitForResults(page);
    const result = await snapshot(page);
    assert.ok(result.sources.every((candidate) => candidate === source));
    assert.ok(result.locales.every((locale) => locale === "ja"));
    assert.ok(result.links.every((link) => new URL(link.href).hostname === hostname));
    await page.close();
  }
});

test("blocked and disabled index states are distinguishable", async () => {
  const blockedPage = await newPage();
  await gotoQuery(blockedPage, "objc NSObject", "&docsLocale=en");
  await blockedPage.waitForSelector('[data-search-status][data-state="empty"]');
  assert.match(
    await blockedPage.$eval("[data-index-coverage]", (element) => element.textContent),
    /index unavailable/
  );
  await blockedPage.close();

  const disabledPage = await newPage();
  await gotoQuery(disabledPage, "commonlisp format source:all", "&docsLocale=en");
  await disabledPage.waitForSelector('[data-search-status][data-state="empty"]');
  assert.match(
    await disabledPage.$eval("[data-index-coverage]", (element) => element.textContent),
    /index disabled/
  );
  await disabledPage.close();
});

test("empty and index-load failure states are explicit", async () => {
  const emptyPage = await newPage();
  await gotoQuery(emptyPage, "python zzz-no-such-document-zzz", "&docsLocale=en");
  await emptyPage.waitForSelector('[data-search-status][data-state="empty"]');
  assert.match(await emptyPage.$eval("[data-search-status]", (status) => status.textContent), /No results/);
  await emptyPage.close();

  const errorPage = await newPage();
  await errorPage.setRequestInterception(true);
  errorPage.on("request", async (request) => {
    if (new URL(request.url()).pathname === "/search-index/manifest.json") {
      await request.respond({ status: 503, contentType: "application/json", body: "{}" });
    } else {
      await request.continue();
    }
  });
  await gotoQuery(errorPage, "python list", "&docsLocale=en");
  await errorPage.waitForSelector('[data-search-status][data-state="error"]');
  assert.match(await errorPage.$eval("[data-search-status]", (status) => status.textContent), /could not be loaded/);
  await errorPage.close();
});

test("results stay visible at desktop and mobile widths", async () => {
  for (const width of [1280, 375]) {
    const page = await newPage({ width, height: 800 });
    await gotoQuery(page, "python list", "&docsLocale=en");
    await waitForResults(page);
    const layout = await page.$eval(".result-item", (item) => {
      const rect = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      return { width: rect.width, height: rect.height, display: style.display, visibility: style.visibility };
    });
    assert.ok(layout.width > 0 && layout.height > 0, `visible dimensions at ${width}px`);
    assert.notEqual(layout.display, "none");
    assert.equal(layout.visibility, "visible");
    await page.close();
  }
});

test("worker search stays responsive and warm mobile search completes within 500ms", async () => {
  const page = await newPage({ width: 390, height: 800 });
  await page.emulateCPUThrottling(4);
  await page.evaluateOnNewDocument(() => {
    globalThis.__odsLongTasks = [];
    new PerformanceObserver((list) => {
      globalThis.__odsLongTasks.push(
        ...list.getEntries().map((entry) => ({ startTime: entry.startTime, duration: entry.duration }))
      );
    }).observe({ type: "longtask", buffered: true });
  });

  await gotoQuery(page, "python,rust iterator", "&docsLocale=en");
  await waitForResults(page);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
  await waitForResults(page);

  const performanceResult = await page.evaluate(() => {
    const startedAt = performance.getEntriesByName("ods-search-start").at(-1)?.startTime ?? 0;
    const duration = Number(
      document.querySelector("[data-search-results]")?.dataset.searchDurationMs ?? "Infinity"
    );
    const searchLongTasks = (globalThis.__odsLongTasks ?? []).filter(
      (entry) => entry.startTime >= startedAt && entry.duration > 50
    );
    return { duration, searchLongTasks };
  });

  assert.ok(performanceResult.duration <= 500, `warm search took ${performanceResult.duration}ms`);
  assert.deepEqual(performanceResult.searchLongTasks, []);
  await page.close();
});
