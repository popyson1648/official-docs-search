import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";
import puppeteer, { PredefinedNetworkConditions } from "puppeteer";

const root = resolve(import.meta.dirname, "../..");
const searchManifest = JSON.parse(
  readFileSync(resolve(root, "public/search-index/manifest.json"), "utf8")
);
const trustedCommunitySourceIds = [
  "comprehensive-rust",
  "javascript-info",
  "typescript-deep-dive",
  "go-by-example",
  "cpp-core-guidelines",
  "php-the-right-way",
  "elixir-school",
  "learn-you-a-haskell",
  "advanced-r",
  "clojure-guides",
  "fsharp-for-fun-and-profit",
  "zig-guide",
  "programming-in-d",
  "cornell-ocaml",
  "solidity-by-example",
  "common-lisp-cookbook",
  "webdev-html",
  "webdev-css"
];
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

async function disableSearchWorker(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(globalThis, "Worker", {
      value: undefined,
      configurable: true
    });
  });
}

async function gotoQuery(page, query, extras = "") {
  await page.goto(`${app.baseUrl}/?q=${encodeURIComponent(query)}&ui=en${extras}`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000
  });
}

async function waitForResults(page) {
  await page.waitForSelector('[data-search-status][data-state="success"]', { timeout: 20_000 });
  await page.waitForSelector(".result-item a[href]", { timeout: 20_000 });
}

async function waitForResultFilter(page) {
  await page.waitForFunction(
    () => {
      const status = document.querySelector("[data-search-status]");
      const filters = document.querySelector(".result-filter-shell");
      return (
        status?.getAttribute("data-state") === "success" &&
        filters?.getAttribute("aria-busy") !== "true"
      );
    },
    { timeout: 20_000 }
  );
}

test("[layout] result loading uses centered accessible wave skeletons", async () => {
  const loadingManifest = {
    schemaVersion: 2,
    generatorVersion: "loading-fixture",
    catalogSha256: "loading-fixture",
    entries: [
      {
        sourceId: "python-docs",
        sourceName: "Python Documentation",
        sourceKind: "official",
        programmingLanguage: "python",
        docsLocale: "en",
        status: "supported",
        path: "/search-index/loading.fixture.json",
        recordCount: 1
      }
    ]
  };
  const loadingBundle = {
    schemaVersion: 2,
    sourceId: "python-docs",
    docsLocale: "en",
    urlPrefix: "https://docs.python.org/3/",
    records: [["Sorting HOW TO", "howto/sorting.html", "Python HOW TOs"]]
  };
  for (const reducedMotion of [false, true]) {
    const page = await newPage({ width: reducedMotion ? 390 : 1280, height: 800 });
    await disableSearchWorker(page);
    await page.setCacheEnabled(false);
    if (reducedMotion) {
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" }
      ]);
    }
    await page.setRequestInterception(true);
    page.on("request", async (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === "/search-index/runtime-manifest.json") {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 900));
        await request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(loadingManifest)
        });
        return;
      }
      if (pathname === "/search-index/loading.fixture.json") {
        await request.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(loadingBundle)
        });
        return;
      }
      await request.continue();
    });

    await gotoQuery(
      page,
      "python sorting",
      "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
    );
    await page.waitForSelector("[data-result-loading]:not([hidden])");
    const loading = await page.evaluate(() => {
      const results = document.querySelector("[data-search-results]");
      const view = document.querySelector("[data-result-loading]");
      const spinner = document.querySelector(".result-loading-spinner");
      const card = document.querySelector(".result-skeleton-card");
      const status = document.querySelector("[data-search-status]");
      const viewRect = view.getBoundingClientRect();
      const spinnerRect = spinner.getBoundingClientRect();
      return {
        busy: results.getAttribute("aria-busy"),
        skeletonCount: document.querySelectorAll(".result-skeleton-card").length,
        statusState: status.getAttribute("data-state"),
        statusScreenReaderOnly: status.classList.contains("sr-only"),
        statusText: status.textContent,
        centerDelta: Math.abs(
          spinnerRect.top + spinnerRect.height / 2 -
            (viewRect.top + viewRect.height / 2)
        ),
        waveAnimation: getComputedStyle(card, "::after").animationName,
        spinnerAnimation: getComputedStyle(spinner).animationName
      };
    });
    assert.equal(loading.busy, "true");
    assert.equal(loading.skeletonCount, 4);
    assert.equal(loading.statusState, "loading");
    assert.equal(loading.statusScreenReaderOnly, true);
    assert.match(loading.statusText, /Loading search results/);
    assert.ok(loading.centerDelta <= 1);
    if (reducedMotion) {
      assert.equal(loading.waveAnimation, "none");
      assert.equal(loading.spinnerAnimation, "none");
    } else {
      assert.equal(loading.waveAnimation, "result-skeleton-wave");
      assert.equal(loading.spinnerAnimation, "result-loading-spin");
    }

    await waitForResults(page);
    assert.deepEqual(
      await page.$eval("[data-search-results]", (results) => ({
        busy: results.getAttribute("aria-busy"),
        loadingHidden: document.querySelector("[data-result-loading]").hidden,
        statusScreenReaderOnly: document
          .querySelector("[data-search-status]")
          .classList.contains("sr-only")
      })),
      {
        busy: "false",
        loadingHidden: true,
        statusScreenReaderOnly: false
      }
    );
    await page.close();
  }
});

async function snapshot(page) {
  return await page.evaluate(() => ({
    state: document.querySelector("[data-search-status]")?.dataset.state,
    languages: [...document.querySelectorAll(".result-item")].map((item) => item.dataset.language),
    sources: [...document.querySelectorAll(".result-item")].flatMap((item) =>
      (item.dataset.sourceIds ?? item.dataset.sourceId ?? "").split(" ").filter(Boolean)
    ),
    locales: [...document.querySelectorAll(".result-item")].flatMap((item) =>
      (item.dataset.docsLocales ?? item.dataset.docsLocale ?? "").split(" ").filter(Boolean)
    ),
    links: [...document.querySelectorAll(".result-item a[href]")].map((link) => ({
      href: link.href,
      target: link.target,
      rel: link.rel
    }))
  }));
}

async function clickAndWaitForClientNavigation(page, selector) {
  const pageLoadCount = await armClientPageLoadCounter(page);
  await page.$eval(selector, (element) => element.click());
  await waitForClientPageLoad(page, pageLoadCount);
}

async function armClientPageLoadCounter(page) {
  return await page.evaluate(() => {
    if (!globalThis.__odsE2ePageLoadCounterInstalled) {
      globalThis.__odsE2ePageLoadCount = 0;
      document.addEventListener("astro:page-load", () => {
        globalThis.__odsE2ePageLoadCount += 1;
      });
      globalThis.__odsE2ePageLoadCounterInstalled = true;
    }
    return globalThis.__odsE2ePageLoadCount;
  });
}

async function waitForClientPageLoad(page, previousCount) {
  await page.waitForFunction(
    (count) => globalThis.__odsE2ePageLoadCount > count,
    { timeout: 20_000 },
    previousCount
  );
}

before(async () => {
  app = await startApp();
  browser = await puppeteer.launch({
    args: process.env.CI === "true"
      ? ["--no-sandbox", "--disable-setuid-sandbox"]
      : []
  });
});

after(async () => {
  await browser?.close();
  await stopApp(app);
});

test("[smoke] initial page, help, validation, and language tags work", async () => {
  const page = await newPage();
  await page.goto(app.baseUrl, { waitUntil: "domcontentloaded" });
  assert.equal(await page.$("[data-search-results]"), null);
  const fontContract = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      externalStylesheet: document.querySelector(
        'link[href^="https://fonts.googleapis.com/css2"]'
      )?.getAttribute("href"),
      bodyFontFamily: getComputedStyle(document.body).fontFamily,
      weights: [...document.fonts].reduce((result, face) => {
        if (face.family === "Alexandria" || face.family === "LINE Seed JP") {
          const weights = result[face.family] ?? [];
          if (!weights.includes(face.weight)) weights.push(face.weight);
          result[face.family] = weights.sort();
        }
        return result;
      }, {})
    };
  });
  assert.equal(fontContract.externalStylesheet, undefined);
  assert.equal(
    fontContract.bodyFontFamily,
    'Alexandria, "LINE Seed JP", sans-serif'
  );
  assert.deepEqual(fontContract.weights, {
    Alexandria: ["400", "500", "600", "700"],
    "LINE Seed JP": ["400", "700"]
  });

  await page.click("[data-help-open]");
  assert.equal(await page.$eval("[data-help-dialog]", (dialog) => dialog.open), true);
  assert.equal(
    await page.$eval("[data-help-dialog]", (dialog) => dialog.getAttribute("aria-labelledby")),
    "search-help-dialog-title"
  );
  assert.equal(
    await page.$eval(":focus", (element) => element.matches("[data-help-dialog] .icon-button")),
    true
  );
  await page.click("[data-help-dialog] .icon-button");
  assert.equal(
    await page.$eval(":focus", (element) => element.matches("[data-help-open]")),
    true
  );

  await gotoQuery(page, "python");
  assert.match(await page.$eval(".notice.error", (notice) => notice.textContent), /Enter search words/);

  await gotoQuery(page, "python,rust iterator");
  assert.deepEqual(
    await page.$$eval("[data-remove-tag]", (buttons) => buttons.map((button) => button.dataset.removeTag)),
    ["python", "rust"]
  );
  const tagGap = await page.evaluate(() => {
    const input = document.querySelector("[data-query-input]").getBoundingClientRect();
    const tags = document.querySelector("[data-active-tags]").getBoundingClientRect();
    return tags.top - input.bottom;
  });
  assert.ok(tagGap >= 10, `query-tag gap was ${tagGap}px`);
  await clickAndWaitForClientNavigation(page, '[data-remove-tag="python"]');
  assert.equal(new URL(page.url()).searchParams.get("q"), "rust iterator");
  await page.close();
});

test("[smoke] the search form keeps its GET fallback without JavaScript", async () => {
  const page = await newPage();
  await page.setJavaScriptEnabled(false);
  await page.goto(`${app.baseUrl}/?ui=en`, { waitUntil: "domcontentloaded" });
  await page.type("[data-query-input]", "cpp sort");
  const initialTimeOrigin = await page.evaluate(() => performance.timeOrigin);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 20_000 }),
    page.click('.search-group button[type="submit"]')
  ]);
  assert.equal(new URL(page.url()).searchParams.get("q"), "cpp sort");
  assert.notEqual(
    await page.evaluate(() => performance.timeOrigin),
    initialTimeOrigin
  );
  assert.equal(
    await page.$eval("[data-search-results]", (results) => results.dataset.query),
    "sort"
  );
  await page.close();
});

test("[smoke] search guidance uses concrete unboxed examples and accurate aliases", async () => {
  const page = await newPage();
  await page.goto(`${app.baseUrl}/?ui=ja`, { waitUntil: "domcontentloaded" });

  assert.equal(
    await page.$eval("[data-help-open] .lang-ja", (element) => element.textContent),
    "検索方法"
  );
  assert.equal(
    await page.$eval("#query-example .lang-ja", (element) => element.textContent),
    "例：js promise all"
  );
  assert.equal(
    await page.$eval("[data-query-input]", (element) => element.hasAttribute("placeholder")),
    false
  );
  assert.deepEqual(
    await page.$eval("[data-help-open]", (button) => ({
      controls: button.getAttribute("aria-controls"),
      hasPopup: button.getAttribute("aria-haspopup"),
      type: button.getAttribute("type")
    })),
    {
      controls: "search-help-dialog",
      hasPopup: "dialog",
      type: "button"
    }
  );
  await page.focus("[data-query-input]");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.$eval(":focus", (element) => element.matches("[data-help-open]")),
    true
  );
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  assert.equal(
    await page.$eval(".search-help-tooltip", (element) => getComputedStyle(element).opacity),
    "1"
  );
  await page.click("[data-query-input]");
  const inputFocus = await page.$eval("[data-query-input]", (element) => {
    const style = getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      borderColor: style.borderColor
    };
  });
  assert.equal(inputFocus.outlineColor, "rgb(91, 139, 224)");
  assert.equal(inputFocus.outlineWidth, 2);
  assert.notEqual(inputFocus.borderColor, "rgb(0, 0, 0)");
  await page.click("[data-help-open]");

  const guidance = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".help-rule")];
    return {
      heading: document.querySelector("[data-help-dialog] h2 .lang-ja")?.textContent,
      syntax: rows.map((row) => row.querySelector(".help-syntax")?.textContent),
      examples: rows.map((row) => row.querySelector(".help-example .lang-ja")?.textContent),
      examplesContainCode: rows.some((row) => row.querySelector(".help-example code")),
      exampleStyles: rows.map((row) => {
        const style = getComputedStyle(row.querySelector(".help-example"));
        return {
          backgroundColor: style.backgroundColor,
          borderTopWidth: style.borderTopWidth,
          fontSize: Number.parseFloat(style.fontSize)
        };
      }),
      syntaxFontSize: Number.parseFloat(
        getComputedStyle(rows[0].querySelector(".help-syntax")).fontSize
      ),
      text: document.querySelector(".help-content")?.textContent,
      englishText: [...document.querySelectorAll(".help-content .lang-en")]
        .map((element) => element.textContent)
        .join(" "),
      japaneseText: [...document.querySelectorAll(".help-content .lang-ja")]
        .map((element) => element.textContent)
        .join(" ")
    };
  });

  assert.equal(guidance.heading, "検索方法");
  assert.deepEqual(guidance.syntax, [
    "<language> <search words>",
    "lang:<language> <search words>",
    "<language>, <language> <search words>",
    "lang:<language>,<language> <search words>",
    "<search words> locale:ja",
    "<search words> source:all"
  ]);
  assert.deepEqual(guidance.examples, [
    "例：js promise all",
    "例：lang:rust iterator",
    "例：rust, ts generic",
    "例：lang:python,rust iterator",
    "例：iterator locale:ja",
    "例：proxy source:all"
  ]);
  assert.equal(guidance.examplesContainCode, false);
  assert.ok(
    guidance.exampleStyles.every(
      (style) =>
        style.backgroundColor === "rgba(0, 0, 0, 0)" &&
        style.borderTopWidth === "0px" &&
        style.fontSize < guidance.syntaxFontSize
    )
  );
  assert.doesNotMatch(guidance.englishText, /\.py\b|extension/i);
  assert.doesNotMatch(guidance.japaneseText, /\.py\b|拡張子/);
  assert.match(guidance.japaneseText, /py や ts などの短縮名/);
  assert.match(
    guidance.japaneseText,
    /検索語を複数入力すると、すべてを含む結果に絞り込みます。/
  );
  assert.equal(
    guidance.japaneseText.match(/検索語を複数入力すると、すべてを含む結果に絞り込みます。/g)
      ?.length,
    1
  );
  assert.doesNotMatch(
    await page.$eval("body", (element) => element.textContent),
    /<language> <search words> \/ <search words>/
  );
  await page.close();
});

test("[smoke] the visible JavaScript example performs a multi-token AND search", async () => {
  const page = await newPage();
  await gotoQuery(page, "js promise all", "&docsLocale=en");
  await waitForResults(page);
  const result = await snapshot(page);
  assert.ok(result.languages.length > 0);
  assert.ok(result.languages.every((language) => language === "javascript"));
  assert.equal(
    await page.$eval("[data-search-results]", (element) => element.dataset.query),
    "promise all"
  );
  assert.ok(
    await page.$$eval(".result-item", (items) =>
      items.every((item) => {
        const searchable = [
          item.querySelector("h2")?.textContent,
          item.querySelector(".result-group-source-section")?.textContent
        ]
          .join(" ")
          .toLocaleLowerCase();
        return searchable.includes("promise") && searchable.includes("all");
      })
    )
  );
  await page.close();
});

test("[smoke] Sphinx section context renders as plain text instead of raw markup", async () => {
  const page = await newPage();
  await gotoQuery(page, "python pathlib glob", "&docsLocale=ja&ui=ja");
  await waitForResults(page);
  const section = await page.$eval(".result-group-source-section", (element) => ({
    text: element.textContent,
    html: element.innerHTML
  }));
  assert.match(section.text, /pathlib/);
  assert.doesNotMatch(section.text, /<\/?(?:code|span)\b/i);
  assert.doesNotMatch(section.html, /&lt;\/?(?:code|span)\b/i);
  await page.close();
});

test("[smoke] single-language official search returns real linked results in new tabs", async () => {
  const page = await newPage();
  await gotoQuery(
    page,
    "python list",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
  );
  await waitForResults(page);
  const result = await snapshot(page);

  assert.equal(result.state, "success");
  assert.ok(result.links.length > 0);
  assert.ok(result.languages.every((language) => language === "python"));
  assert.ok(result.links.every((link) => new URL(link.href).hostname === "docs.python.org"));
  assert.ok(result.links.every((link) => link.target === "_blank" && link.rel.includes("noopener")));
  await page.close();
});

test("[smoke] query and search-index strings render as text without executing markup", async () => {
  const page = await newPage();
  await disableSearchWorker(page);
  const searchPayload =
    'safety </input><img id="query-xss" src=x onerror="globalThis.__odsXss=1">';
  const queryPayload = `python ${searchPayload}`;
  const titlePayload =
    `${searchPayload} </a><img id="title-xss" src=x onerror="globalThis.__odsXss=1">`;
  const sourcePayload =
    'Python </span><img id="source-xss" src=x onerror="globalThis.__odsXss=1">';
  const localePayload =
    'en"><img id="locale-xss" src=x onerror="globalThis.__odsXss=1">';
  const sectionPayload =
    'Security </span><img id="section-xss" src=x onerror="globalThis.__odsXss=1">';
  const qualificationPayload =
    'Note: </span><img id="qualification-xss" src=x onerror="globalThis.__odsXss=1">';
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
        recordCount: 1,
        qualification: qualificationPayload,
        qualificationJa: qualificationPayload
      }
    ]
  };
  const bundle = {
    schemaVersion: 2,
    sourceId: "python-docs",
    docsLocale: localePayload,
    urlPrefix: "https://docs.python.org/3/",
    records: [[titlePayload, urlSuffix, sectionPayload]]
  };

  await page.evaluateOnNewDocument(() => {
    globalThis.__odsXss = 0;
  });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/search-index/runtime-manifest.json") {
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
    const item = document.querySelector(".result-item");
    const link = item?.querySelector(".result-group-source");
    return {
      executed: globalThis.__odsXss,
      injectedElements: [
        "query-xss",
        "title-xss",
        "source-xss",
        "locale-xss",
        "section-xss",
        "qualification-xss",
        "url-xss"
      ].filter((id) => document.getElementById(id)),
      queryValue: document.querySelector("[data-query-input]")?.value,
      highlightText: document.querySelector("[data-query-highlight]")?.textContent,
      title: item?.querySelector("h2")?.textContent,
      href: link?.href,
      language: item?.querySelector(".result-language-tag")?.textContent,
      source: item?.querySelector(".result-source-name")?.textContent,
      metadata: item?.querySelector(".result-group-source-meta")?.textContent,
      visibleDomain: item?.querySelector(".result-group-source-domain")?.textContent,
      section: item?.querySelector(".result-group-source-section")?.textContent,
      qualification: document.querySelector(
        "[data-result-source-notes] li span"
      )?.textContent
    };
  });

  assert.equal(rendered.executed, 0);
  assert.deepEqual(rendered.injectedElements, []);
  assert.equal(rendered.queryValue, queryPayload);
  assert.equal(rendered.highlightText, queryPayload);
  assert.equal(rendered.title, titlePayload);
  assert.equal(rendered.source, sourcePayload);
  assert.match(
    rendered.metadata,
    new RegExp(localePayload.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
  assert.equal(rendered.section, sectionPayload);
  assert.match(
    rendered.qualification,
    new RegExp(qualificationPayload.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );
  assert.equal(new URL(rendered.href).protocol, "https:");
  assert.match(rendered.href, /%22%3E%3Cimg/);
  assert.equal(rendered.visibleDomain, "docs.python.org");
  assert.equal(rendered.language, "Python");
  await page.close();
});

test("[catalog] one multi-language query returns results for every selected language", async () => {
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

test("[catalog] C++ exact, fuzzy, and Japanese community searches return complete reference results", async () => {
  const page = await newPage();

  await gotoQuery(page, "cpp sort", "&docsLocale=en");
  await waitForResults(page);
  const exact = await snapshot(page);
  assert.equal(exact.sources[0], "cppreference-cpp");
  assert.ok(
    exact.links.some((link) => new URL(link.href).pathname === "/cpp/algorithm/sort")
  );

  await gotoQuery(page, "cpp srot", "&docsLocale=en");
  await waitForResults(page);
  assert.ok(
    (await snapshot(page)).links.some(
      (link) => new URL(link.href).pathname === "/cpp/algorithm/sort"
    )
  );

  await gotoQuery(page, "cpp sort", "&docsLocale=ja");
  await waitForResults(page);
  const japanese = await snapshot(page);
  assert.ok(japanese.sources.includes("cpprefjp"));
  assert.ok(
    japanese.links.some((link) => new URL(link.href).hostname === "cpprefjp.github.io")
  );
  const cpprefjpSortTitles = await page.$$eval(
    '.result-item[data-source-ids~="cpprefjp"] h2',
    (headings) =>
      headings
        .map((heading) => heading.textContent?.trim() ?? "")
        .filter((title) => title.includes("sort"))
  );
  assert.ok(cpprefjpSortTitles.includes("std::sort"));
  assert.ok(cpprefjpSortTitles.includes("std::list::sort"));
  assert.ok(cpprefjpSortTitles.every((title) => title !== "sort"));

  await gotoQuery(page, "cpp P2300R10", "&docsLocale=en");
  await waitForResults(page);
  const paper = await page.$eval(
    '.result-item[data-source-id="wg21-papers"]',
    (item) => ({
      href: item.querySelector(".result-group-source")?.href,
      documentKind: item.querySelector(".document-kind")?.textContent,
      status: item.querySelector(".result-proposal-status")?.textContent,
      warning: [...item.querySelectorAll(".result-qualification")]
        .map((part) => part.textContent)
        .join(" "),
      sourceNote: document.querySelector(
        "[data-result-source-notes] li .lang-en"
      )?.textContent
    })
  );
  assert.match(paper.href ?? "", /\/p2300r10\.(?:html|pdf)$/i);
  assert.match(paper.documentKind ?? "", /Proposal/);
  assert.match(paper.status ?? "", /Status: Adopted/);
  assert.match(paper.sourceNote ?? "", /Committee papers can be drafts/);
  assert.doesNotMatch(paper.warning ?? "", /may not describe current adopted behavior/);
  await page.close();
});

test("[layout] duplicate reference symbols group by source and long results disclose 15 at a time", async () => {
  const page = await newPage({ width: 390, height: 844 });
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "cpp sort source:all"
    )}&docsLocale=ja&ui=ja`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);

  const initial = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".result-item")];
    const sort = items.find(
      (item) => item.querySelector("h2")?.textContent?.trim() === "std::sort"
    );
    const filter = document.querySelector("[data-result-filter-open]");
    const filterRect = filter?.getBoundingClientRect();
    const heading = sort?.querySelector("h2");
    const sourceNames = [
      ...(sort?.querySelectorAll(".result-group-source .result-source-name") ?? [])
    ];
    const sourceLinks = [
      ...(sort?.querySelectorAll("[data-result-source-id]") ?? [])
    ];
    const sourceNotesSummary = document.querySelector(
      ".result-source-notes summary"
    );
    const sourcePickerSummary = document.querySelector(
      ".source-details summary"
    );
    const style = (element) => {
      if (!element) return undefined;
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        fontSize: Number.parseFloat(computed.fontSize),
        fontWeight: Number.parseFloat(computed.fontWeight),
        borderTopWidth: computed.borderTopWidth,
        borderBottomWidth: computed.borderBottomWidth,
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius
      };
    };
    const sortIndex = items.indexOf(sort);
    const nextItem = sortIndex >= 0 ? items[sortIndex + 1] : undefined;
    return {
      itemCount: items.length,
      total: Number.parseInt(
        document.querySelector(
          "[data-search-status] .lang-ja"
        )?.textContent ?? "",
        10
      ),
      loadMoreText: document
        .querySelector("[data-result-load-more] .lang-ja")
        ?.textContent?.trim(),
      groupSize: Number(sort?.dataset.resultGroupSize),
      groupHeadingLinks: sort?.querySelectorAll("h2 a").length,
      sourceIds: [
        ...(sort?.querySelectorAll("[data-result-source-id]") ?? [])
      ].map((link) => link.dataset.resultSourceId),
      sourceLinks: sourceLinks.map((link) => ({
        href: link.href,
        target: link.target,
        rel: link.rel
      })),
      sourceLinkStyles: sourceLinks.map(style),
      headingStyle: style(heading),
      sourceNameStyles: sourceNames.map(style),
      groupStyle: style(sort),
      sourceNotesStyle: style(sourceNotesSummary),
      sourcePickerStyle: style(sourcePickerSummary),
      groupGap: nextItem
        ? nextItem.getBoundingClientRect().top -
          sort.getBoundingClientRect().bottom
        : undefined,
      languageLabel: sort
        ?.querySelector(".result-language-tag")
        ?.textContent?.trim(),
      filterText: filter?.querySelector(".lang-ja")?.textContent?.trim(),
      filterWidth: filterRect?.width,
      filterHeight: filterRect?.height,
      pageOverflows: document.documentElement.scrollWidth > window.innerWidth
    };
  });

  assert.equal(initial.itemCount, 15);
  assert.ok(initial.total > initial.itemCount);
  assert.match(initial.loadMoreText ?? "", /^さらに\d+件表示$/);
  assert.ok(initial.groupSize >= 2);
  assert.equal(initial.groupHeadingLinks, 0);
  assert.ok(initial.sourceIds.includes("cpprefjp"));
  assert.ok(initial.sourceIds.includes("cppreference-cpp"));
  assert.ok(
    initial.sourceLinks.every(
      (link) =>
        new URL(link.href).protocol === "https:" &&
        link.target === "_blank" &&
        link.rel.includes("noopener")
    )
  );
  assert.equal(initial.languageLabel, "C++");
  assert.equal(initial.filterText, "絞り込み");
  assert.ok(initial.filterWidth >= 32 && initial.filterWidth <= 36);
  assert.equal(initial.filterHeight, 32);
  assert.ok(
    initial.sourceLinkStyles.every(
      (style) =>
        style.borderTopWidth === "0px" &&
        style.borderBottomWidth === "0px" &&
        style.backgroundColor === "rgba(0, 0, 0, 0)" &&
        style.borderRadius === "0px" &&
        style.width < initial.groupStyle.width
    )
  );
  assert.ok(
    initial.sourceNameStyles.every(
      (style) =>
        initial.headingStyle.fontSize > style.fontSize &&
        initial.headingStyle.fontWeight > style.fontWeight
    )
  );
  assert.equal(initial.groupStyle.borderTopWidth, "0px");
  assert.equal(initial.groupStyle.borderBottomWidth, "0px");
  assert.ok(initial.groupGap >= 18);
  assert.ok(initial.groupStyle.height < 180);
  assert.ok(initial.sourceNotesStyle.height <= initial.sourcePickerStyle.height);
  assert.equal(initial.sourceNotesStyle.borderTopWidth, "0px");
  assert.equal(initial.pageOverflows, false);

  const pageIdentity = await page.evaluate(() => ({
    href: location.href,
    timeOrigin: performance.timeOrigin
  }));
  await page.click("[data-result-load-more]");
  assert.equal(
    await page.$$eval(".result-item", (items) => items.length),
    Math.min(30, initial.total)
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      href: location.href,
      timeOrigin: performance.timeOrigin
    })),
    pageIdentity
  );

  while (
    await page.$eval(
      "[data-result-load-more]",
      (button) => !button.hidden
    )
  ) {
    await page.click("[data-result-load-more]");
  }
  assert.equal(
    await page.$$eval(".result-item", (items) => items.length),
    initial.total
  );
  assert.equal(
    await page.$eval(
      "[data-result-pagination] [role='status'] .lang-ja",
      (element) => element.textContent
    ),
    `全${initial.total}件を表示しました`
  );
  await page.close();
});

test("[layout] the Top control appears after scrolling and returns focus to the heading", async () => {
  const page = await newPage({ width: 390, height: 800 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" }
  ]);
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "cpp sort source:all"
    )}&docsLocale=ja&ui=ja`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);

  assert.equal(
    await page.$eval("[data-back-to-top]", (button) => button.hidden),
    true
  );
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForSelector("[data-back-to-top]:not([hidden])");

  const visible = await page.$eval("[data-back-to-top]", (button) => {
    const rect = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return {
      label: button.getAttribute("aria-label"),
      width: rect.width,
      height: rect.height,
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom,
      position: style.position,
      animationName: style.animationName,
      pageOverflows: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  assert.deepEqual(visible, {
    label: "ページ上部へ",
    width: 44,
    height: 44,
    right: 16,
    bottom: 16,
    position: "fixed",
    animationName: "none",
    pageOverflows: false
  });

  await page.click("[data-back-to-top]");
  await page.waitForFunction(() => window.scrollY === 0);
  await page.waitForFunction(
    () => document.querySelector("[data-back-to-top]")?.hidden === true
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      focused: document.activeElement?.id,
      hidden: document.querySelector("[data-back-to-top]")?.hidden
    })),
    { focused: "search-heading", hidden: true }
  );
  await page.close();
});

test("[smoke] Japanese interface labels use user-facing names", async () => {
  const page = await newPage();
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "cpp sort"
    )}&docsLocale=ja&ui=ja`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);

  assert.equal(await page.title(), "ドキュメント検索");
  assert.equal(
    await page.$eval(".source-details summary .lang-ja", (element) => element.textContent),
    "ソース"
  );
  assert.equal(
    await page.$eval('label[for="q"] .lang-ja', (element) => element.textContent),
    "検索語"
  );
  assert.match(
    await page.$eval("[data-remove-tag] .lang-ja", (element) => element.textContent),
    /C\+\+を検索条件から削除/
  );
  assert.equal(
    await page.$eval(
      ".result-language-tag",
      (element) => element.textContent
    ),
    "C++"
  );

  await page.$eval('[data-ui-radio][value="en"]', (radio) => radio.click());
  await page.waitForFunction(() => document.documentElement.lang === "en");
  assert.equal(await page.title(), "Official Docs Search");
  assert.equal(
    await page.$eval("[data-back-to-top]", (button) =>
      button.getAttribute("aria-label")
    ),
    "Top"
  );
  await page.close();
});

test("[catalog] the three-state source policy is silent, configurable, and overridden by source syntax", async () => {
  const page = await newPage();

  await gotoQuery(page, "cpp sort", "&docsLocale=en");
  await waitForResults(page);
  const automatic = await page.evaluate(() => ({
    notice: document.querySelector("[data-auto-fallback-notice]"),
    policy: document.querySelector("[data-source-policy-radio]:checked")?.value,
    cpprefjp: {
      checked: document.querySelector('[data-source-option][value="cpprefjp"]')?.checked,
      disabled: document.querySelector('[data-source-option][value="cpprefjp"]')?.disabled
    }
  }));
  assert.equal(automatic.notice, null);
  assert.equal(automatic.policy, "fallback");
  assert.deepEqual(automatic.cpprefjp, { checked: true, disabled: false });

  await gotoQuery(page, "cpp sort source:official", "&docsLocale=en");
  await waitForResults(page);
  assert.equal(await page.$("[data-auto-fallback-notice]"), null);
  assert.deepEqual(
    await page.$eval('[data-source-option][value="cpprefjp"]', (input) => ({
      checked: input.checked,
      disabled: input.disabled
    })),
    { checked: false, disabled: true }
  );
  assert.equal(
    await page.$eval("[data-source-policy-radio]:checked", (input) => input.value),
    "official"
  );
  assert.ok((await snapshot(page)).sources.every((source) => source === "wg21-papers"));

  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent("cpp sort")}&ui=en&docsLocale=en&sourcePolicy=official`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);
  assert.equal(await page.$("[data-auto-fallback-notice]"), null);
  assert.equal(
    await page.$eval("[data-source-policy-radio]:checked", (input) => input.value),
    "official"
  );
  assert.equal(
    await page.$eval('[data-source-option][value="cpprefjp"]', (input) => input.disabled),
    true
  );
  await page.close();
});

test("[smoke] search suggestions use the indexed fuzzy search and support keyboard selection", async () => {
  const page = await newPage();
  await page.goto(`${app.baseUrl}/?ui=en`, { waitUntil: "domcontentloaded" });
  await page.type("[data-query-input]", "cpp sor");
  await page.click("[data-help-open]");
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
  assert.equal(await page.$eval("[data-search-suggestions]", (list) => list.hidden), true);
  await page.$eval("[data-help-dialog]", (dialog) => dialog.close());

  await page.$eval("[data-query-input]", (input) => {
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.type(
    "[data-query-input]",
    "cpp, rust ranges   sort source:all"
  );
  await page.waitForSelector("[data-search-suggestions]:not([hidden]) [role='option']", {
    timeout: 20_000
  });
  const suggestions = await page.evaluate(() => ({
    expanded: document.querySelector("[data-query-input]")?.getAttribute("aria-expanded"),
    values: [...document.querySelectorAll("[data-search-suggestions] [role='option']")]
      .map((option) => option.textContent),
    count: document.querySelectorAll("[data-search-suggestions] [role='option']").length
  }));
  assert.equal(suggestions.expanded, "true");
  assert.ok(suggestions.count > 0 && suggestions.count <= 8);
  assert.ok(suggestions.values.some((value) => /sort/i.test(value)));

  await page.keyboard.press("Escape");
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
  assert.equal(await page.$eval("[data-search-suggestions]", (list) => list.hidden), true);
  await page.keyboard.type(" ");
  await page.waitForSelector("[data-search-suggestions]:not([hidden]) [role='option']", {
    timeout: 20_000
  });
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page.$eval("[data-query-input]", (input) => input.getAttribute("aria-activedescendant")),
    "search-suggestion-0"
  );
  const pageLoadCount = await armClientPageLoadCounter(page);
  await page.keyboard.press("Enter");
  await waitForClientPageLoad(page, pageLoadCount);
  const selectedQuery = (new URL(page.url()).searchParams.get("q") ?? "").trim();
  assert.match(selectedQuery, /^cpp, rust /);
  assert.match(selectedQuery, / source:all$/);
  assert.match(selectedQuery, /sort/i);
  await waitForResults(page);
  await page.close();
});

test("[filters] result filters narrow a multi-language search by language and site without navigation", async () => {
  const page = await newPage();
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "rust, ts generic source:all"
    )}&ui=ja&docsLocale=en`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);

  const initial = await snapshot(page);
  assert.deepEqual(new Set(initial.languages), new Set(["rust", "typescript"]));
  assert.deepEqual(
    new Set(initial.sources),
    new Set([
      "rust-docs",
      "comprehensive-rust",
      "typescript-docs",
      "typescript-deep-dive"
    ])
  );

  const initialPageIdentity = await page.evaluate(() => ({
    url: location.href,
    timeOrigin: performance.timeOrigin
  }));
  const initialResultTop = await page.$eval(".result-item", (element) =>
    element.getBoundingClientRect().top
  );
  const trigger = "[data-result-filter-open]";
  assert.equal(
    await page.$eval(`${trigger} .lang-ja`, (element) => element.textContent),
    "絞り込み"
  );
  assert.equal(await page.$eval(trigger, (element) => element.getAttribute("aria-expanded")), "false");

  await page.click(trigger);
  const opened = await page.evaluate(() => {
    const controls = document.querySelector(".result-filter-controls");
    const panel = document.querySelector(".result-filter-panel");
    const filterTrigger = document.querySelector("[data-result-filter-open]");
    const back = document.querySelector("[data-result-filter-close]");
    const properties = document.querySelector(".result-filter-properties");
    const searchInput = document.querySelector("[data-query-input]");
    return {
      expanded: filterTrigger?.getAttribute("aria-expanded"),
      focusedBack: document.activeElement === back,
      panelPosition: panel ? getComputedStyle(panel).position : "",
      panelRadius: panel ? getComputedStyle(panel).borderRadius : "",
      searchRadius: searchInput ? getComputedStyle(searchInput).borderRadius : "",
      transitionDuration: controls ? getComputedStyle(controls).transitionDuration : "",
      propertiesRole: properties?.getAttribute("role"),
      activeFacetPressed: document
        .querySelector('[data-result-filter-facet="language"]')
        ?.getAttribute("aria-pressed"),
      resultTop: document.querySelector(".result-item")?.getBoundingClientRect().top
    };
  });
  assert.deepEqual(opened, {
    expanded: "true",
    focusedBack: true,
    panelPosition: "absolute",
    panelRadius: "18px",
    searchRadius: "6px",
    transitionDuration: "0.26s",
    propertiesRole: "group",
    activeFacetPressed: "true",
    resultTop: initialResultTop
  });
  assert.equal(
    await page.$eval("[data-result-filter-close] .lang-ja", (element) => element.textContent),
    "ツールに戻る"
  );
  assert.deepEqual(
    new Set(
      await page.$$eval(
        '[data-result-filter-choice="language"]',
        (buttons) => buttons.map((button) => button.textContent)
      )
    ),
    new Set(["Rust", "TypeScript"])
  );
  assert.deepEqual(
    await page.$$eval(
      '[data-result-filter-choice="language"]',
      (buttons) =>
        Object.fromEntries(
          buttons.map((button) => {
            const style = getComputedStyle(button);
            return [
              button.dataset.resultFilterValue,
              {
                backgroundColor: style.backgroundColor,
                color: style.color
              }
            ];
          })
        )
    ),
    {
      rust: {
        backgroundColor: "rgb(222, 165, 132)",
        color: "rgb(0, 0, 0)"
      },
      typescript: {
        backgroundColor: "rgb(49, 120, 198)",
        color: "rgb(255, 255, 255)"
      }
    }
  );

  await page.click('[data-result-filter-facet="site"]');
  assert.equal(
    await page.$eval(".result-filter-panel", (element) => element.hidden),
    false
  );
  assert.equal(
    await page.$eval('[data-result-filter-facet="site"]', (element) =>
      element.getAttribute("aria-pressed")
    ),
    "true"
  );
  assert.deepEqual(
    new Set(
      await page.$$eval(
        '[data-result-filter-choice="site"]',
        (buttons) => buttons.map((button) => button.textContent)
      )
    ),
    new Set([
      "Rust Documentation",
      "Comprehensive Rust",
      "TypeScript Documentation",
      "TypeScript Deep Dive"
    ])
  );
  assert.ok(
    await page.$$eval(
      '[data-result-filter-choice="site"]',
      (buttons) =>
        new Set(
          buttons.map((button) =>
            Math.round(button.getBoundingClientRect().top)
          )
        ).size < buttons.length
    ),
    "site choices should share horizontal rows instead of forming a vertical list"
  );
  assert.ok(
    await page.$$eval(
      '[data-result-filter-choice="site"]',
      (buttons) =>
        buttons.every((button) => {
          const style = getComputedStyle(button);
          return (
            style.backgroundColor === "rgb(255, 255, 255)" &&
            style.color === "rgb(69, 75, 83)" &&
            style.borderColor === "rgb(227, 230, 233)"
          );
        })
    ),
    "site choices should use only neutral colors"
  );

  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => {
      const trigger = document.querySelector("[data-result-filter-open]");
      return (
        trigger?.getAttribute("aria-expanded") === "false" &&
        document.activeElement === trigger
      );
    },
    { timeout: 5_000 }
  );

  await page.click(trigger);
  await page.click("[data-query-input]");
  assert.equal(
    await page.$eval(trigger, (element) => element.getAttribute("aria-expanded")),
    "false"
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement === document.querySelector("[data-result-filter-open]")
    ),
    false
  );

  await page.click(trigger);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
  await page.click("[data-result-filter-close]");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement === document.querySelector("[data-result-filter-open]")
    ),
    true
  );
  assert.equal(
    await page.$eval(".result-filter-controls", (element) =>
      getComputedStyle(element).transitionDuration
    ),
    "0.18s"
  );

  await page.click(trigger);
  await page.click('[data-result-filter-facet="language"]');
  await page.click(
    '[data-result-filter-choice="language"][data-result-filter-value="rust"]'
  );
  await waitForResultFilter(page);
  await page.click(
    '[data-result-filter-choice="language"][data-result-filter-value="typescript"]'
  );
  await waitForResultFilter(page);

  let filtered = await snapshot(page);
  assert.deepEqual(new Set(filtered.languages), new Set(["rust", "typescript"]));
  assert.deepEqual(
    await page.$eval(
      '[data-result-filter-remove="language"]',
      (button) => ({
        category: button
          .closest(".result-filter-active-pill")
          ?.querySelector(".result-filter-active-category .lang-ja")?.textContent,
        value: button
          .closest(".result-filter-active-pill")
          ?.querySelector(".result-filter-active-value")?.textContent,
        accessibleLabel: button.querySelector(".lang-ja.sr-only")?.textContent
      })
    ),
    {
      category: "言語",
      value: "Rust, TypeScript",
      accessibleLabel: "絞り込みを解除：言語"
    }
  );
  assert.equal(
    await page.$$eval('[data-result-filter-active-facet="language"]', (pills) => pills.length),
    1
  );
  assert.deepEqual(
    await page.$eval(
      '[data-result-filter-choice="language"][data-result-filter-value="typescript"]',
      (element) => ({
        panelOpen: !document.querySelector(".result-filter-panel")?.hidden,
        focused: document.activeElement === element
      })
    ),
    { panelOpen: true, focused: true }
  );
  assert.equal(
    await page.$eval(trigger, (element) => element.classList.contains("active")),
    true
  );

  await page.click(
    '[data-result-filter-choice="language"][data-result-filter-value="typescript"]'
  );
  await waitForResultFilter(page);
  filtered = await snapshot(page);
  assert.ok(filtered.languages.length > 0);
  assert.ok(filtered.languages.every((language) => language === "rust"));

  await page.click('[data-result-filter-facet="site"]');
  await page.click(
    '[data-result-filter-choice="site"][data-result-filter-value="comprehensive-rust"]'
  );
  await waitForResultFilter(page);

  filtered = await snapshot(page);
  assert.ok(filtered.sources.length > 0);
  assert.ok(filtered.languages.every((language) => language === "rust"));
  assert.ok(filtered.sources.every((source) => source === "comprehensive-rust"));
  assert.equal(
    await page.$eval("[data-search-status]", (element) => {
      const renderedCount = document.querySelectorAll(".result-item").length;
      const statusCount = Number.parseInt(element.textContent?.match(/\d+/)?.[0] ?? "-1", 10);
      return statusCount === renderedCount;
    }),
    true
  );
  assert.deepEqual(
    new Set(
      await page.$$eval(".result-filter-active-pill", (pills) =>
        pills.map((pill) => pill.querySelector(".result-filter-active-value")?.textContent)
      )
    ),
    new Set(["Rust", "Comprehensive Rust"])
  );
  assert.deepEqual(
    await page.evaluate(() => ({
      url: location.href,
      timeOrigin: performance.timeOrigin
    })),
    initialPageIdentity
  );

  await page.click('[data-result-filter-remove="site"]');
  await waitForResultFilter(page);
  filtered = await snapshot(page);
  assert.ok(filtered.languages.every((language) => language === "rust"));
  assert.ok(new Set(filtered.sources).has("rust-docs"));
  assert.equal(
    await page.$('[data-result-filter-remove="site"]'),
    null
  );

  assert.equal(
    await page.$eval("[data-result-filter-clear] .lang-ja", (element) => element.textContent),
    "すべて解除"
  );
  await page.click("[data-result-filter-clear]");
  await waitForResultFilter(page);
  filtered = await snapshot(page);
  assert.deepEqual(new Set(filtered.languages), new Set(["rust", "typescript"]));
  assert.equal(
    await page.$eval("[data-result-filter-applied]", (element) => element.hidden),
    true
  );

  await page.click('[data-result-filter-facet="language"]');
  await page.click(
    '[data-result-filter-choice="language"][data-result-filter-value="rust"]'
  );
  await waitForResultFilter(page);
  await page.click('[data-result-filter-facet="site"]');
  await page.click(
    '[data-result-filter-choice="site"][data-result-filter-value="comprehensive-rust"]'
  );
  await waitForResultFilter(page);

  await page.$eval('[data-docs-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.getAttribute("data-docs-locale") === "ja" &&
      document.querySelector("[data-search-status]")?.getAttribute("data-state") === "success" &&
      document.querySelector(".result-filter-shell")?.getAttribute("aria-busy") !== "true",
    { timeout: 20_000 }
  );

  filtered = await snapshot(page);
  assert.ok(filtered.sources.length > 0);
  assert.ok(filtered.sources.every((source) => source === "comprehensive-rust"));
  assert.ok(filtered.locales.every((locale) => locale === "en"));
  assert.deepEqual(
    new Set(
      await page.$$eval(".result-filter-active-pill", (pills) =>
        pills.map((pill) => pill.querySelector(".result-filter-active-value")?.textContent)
      )
    ),
    new Set(["Rust", "Comprehensive Rust"])
  );
  assert.deepEqual(
    await page.$$eval(
      "[data-index-coverage] .lang-ja .index-coverage-sources li",
      (items) => items.map((item) => item.textContent)
    ),
    ["Comprehensive Rust"]
  );
  assert.equal(
    await page.$eval("[data-index-coverage] .lang-ja .index-coverage-summary", (element) =>
      element.textContent
    ),
    "次のソースは日本語版がないため、英語の検索結果を表示しています。"
  );
  assert.equal(
    await page.evaluate((timeOrigin) => performance.timeOrigin === timeOrigin, initialPageIdentity.timeOrigin),
    true
  );
  await page.close();
});

test("[filters] client navigation tears down detached result-filter listeners", async () => {
  const page = await newPage();
  await gotoQuery(
    page,
    "rust, ts generic",
    "&docsLocale=en&sourcePolicy=official"
  );
  await waitForResults(page);
  await page.click("[data-result-filter-open]");
  await page.evaluate(() => {
    globalThis.__odsDetachedFilter = {
      panel: document.querySelector(".result-filter-panel"),
      trigger: document.querySelector("[data-result-filter-open]")
    };
  });

  await page.$eval("[data-query-input]", (input) => {
    input.value = "python";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickAndWaitForClientNavigation(
    page,
    '.search-group button[type="submit"]'
  );
  await page.waitForSelector(".notice.error");
  assert.equal(await page.$("[data-search-results]"), null);

  const detachedState = await page.evaluate(() => {
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    const detached = globalThis.__odsDetachedFilter;
    return {
      defaultPrevented: event.defaultPrevented,
      expanded: detached.trigger.getAttribute("aria-expanded"),
      panelHidden: detached.panel.hidden
    };
  });
  assert.deepEqual(detachedState, {
    defaultPrevented: false,
    expanded: "true",
    panelHidden: false
  });
  await page.close();
});

test("[filters] result order switches between relevance and language name without navigation", async () => {
  const page = await newPage();
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "rust, ts generic source:all"
    )}&ui=ja&docsLocale=en`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);
  const identity = await page.evaluate(() => ({
    url: location.href,
    timeOrigin: performance.timeOrigin
  }));

  await page.click("[data-result-filter-open]");
  await page.click('[data-result-filter-facet="order"]');
  assert.deepEqual(
    await page.$$eval(
      '[data-result-filter-choice="order"] .lang-ja',
      (labels) => labels.map((label) => label.textContent)
    ),
    ["関連度順", "言語名の昇順", "言語名の降順"]
  );
  assert.equal(
    await page.$$eval(
      '[data-result-filter-choice="order"]',
      (buttons) =>
        new Set(
          buttons.map((button) =>
            Math.round(button.getBoundingClientRect().top)
          )
        ).size
    ),
    1
  );
  assert.deepEqual(
    await page.$$eval(
      '[data-result-filter-choice="order"]',
      (buttons) =>
        buttons.map((button) => {
          const style = getComputedStyle(button);
          return {
            value: button.dataset.resultFilterValue,
            backgroundColor: style.backgroundColor,
            color: style.color
          };
        })
    ),
    [
      {
        value: "relevance",
        backgroundColor: "rgb(28, 31, 35)",
        color: "rgb(255, 255, 255)"
      },
      {
        value: "language-asc",
        backgroundColor: "rgb(255, 255, 255)",
        color: "rgb(69, 75, 83)"
      },
      {
        value: "language-desc",
        backgroundColor: "rgb(255, 255, 255)",
        color: "rgb(69, 75, 83)"
      }
    ]
  );

  const assertLanguageOrder = async (expectedDirection) => {
    const languages = await page.$$eval(".result-item", (items) =>
      items.map((item) => item.dataset.language)
    );
    const rank = { rust: 0, typescript: 1 };
    for (let index = 1; index < languages.length; index += 1) {
      const comparison = rank[languages[index - 1]] - rank[languages[index]];
      assert.ok(
        expectedDirection === "asc" ? comparison <= 0 : comparison >= 0,
        `${languages.join(", ")} was not ${expectedDirection}`
      );
    }
  };

  await page.click(
    '[data-result-filter-choice="order"][data-result-filter-value="language-asc"]'
  );
  await waitForResultFilter(page);
  await assertLanguageOrder("asc");
  assert.equal(
    await page.$eval(
      '[data-result-filter-active-facet="order"] .result-filter-active-value .lang-ja',
      (element) => element.textContent
    ),
    "言語名の昇順"
  );

  await page.click(
    '[data-result-filter-choice="order"][data-result-filter-value="language-desc"]'
  );
  await waitForResultFilter(page);
  await assertLanguageOrder("desc");

  assert.deepEqual(
    await page.evaluate(() => ({
      url: location.href,
      timeOrigin: performance.timeOrigin,
      titleLinks: document.querySelectorAll(".result-item h2 a").length,
      resultCount: document.querySelectorAll(".result-item").length,
      sourceLists: document.querySelectorAll(".result-item .result-group-sources").length,
      languageTags: document.querySelectorAll(
        ".result-title-row > h2 + .result-language-tag"
      ).length
    })),
    {
      ...identity,
      titleLinks: 0,
      resultCount: await page.$$eval(".result-item", (items) => items.length),
      sourceLists: await page.$$eval(".result-item", (items) => items.length),
      languageTags: await page.$$eval(".result-item", (items) => items.length)
    }
  );
  await page.close();
});

test("[filters] result filters match the reference overlay and responsive interaction at 375px", async () => {
  const page = await newPage({ width: 375, height: 900 });
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "rust, ts generic source:all"
    )}&ui=ja&docsLocale=en`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);
  const resultTop = await page.$eval(".result-item", (element) =>
    element.getBoundingClientRect().top
  );
  await page.click("[data-result-filter-open]");
  assert.equal(
    await page.$eval(".result-item", (element) => element.getBoundingClientRect().top),
    resultTop
  );
  await page.click('[data-result-filter-facet="site"]');
  await page.click(
    '[data-result-filter-choice="site"][data-result-filter-value="comprehensive-rust"]'
  );
  await waitForResultFilter(page);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));

  const layout = await page.evaluate(() => {
    const shell = document.querySelector(".result-filter-shell");
    const controls = document.querySelector(".result-filter-controls");
    const panel = document.querySelector(".result-filter-panel");
    const choices = document.querySelector(".result-filter-choices");
    const visibleTargets = [...document.querySelectorAll(".result-filter-shell button")].filter(
      (button) => button.getClientRects().length > 0
    );
    const panelRect = panel.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      shellLeft: shell.getBoundingClientRect().left,
      shellRight: shell.getBoundingClientRect().right,
      controlsRight: controls.getBoundingClientRect().right,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      panelPosition: getComputedStyle(panel).position,
      panelRadius: getComputedStyle(panel).borderRadius,
      choicesWrap: getComputedStyle(choices).flexWrap,
      choicesOverflowX: getComputedStyle(choices).overflowX,
      choicesScrollWidth: choices.scrollWidth,
      choicesClientWidth: choices.clientWidth,
      choiceRows: new Set(
        [...choices.querySelectorAll("button")].map((choice) =>
          Math.round(choice.getBoundingClientRect().top)
        )
      ).size,
      targets: visibleTargets.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          isChoice: button.classList.contains("result-filter-choice"),
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right
        };
      })
    };
  });

  assert.ok(
    layout.shellLeft >= 0 && layout.shellRight <= layout.viewportWidth,
    `filter bounds ${layout.shellLeft}-${layout.shellRight}px exceeded viewport ${layout.viewportWidth}px`
  );
  assert.ok(layout.controlsRight <= layout.viewportWidth);
  assert.ok(layout.panelLeft >= 0 && layout.panelRight <= layout.viewportWidth);
  assert.equal(layout.panelPosition, "absolute");
  assert.equal(layout.panelRadius, "18px");
  assert.equal(layout.choicesWrap, "nowrap");
  assert.equal(layout.choicesOverflowX, "auto");
  assert.equal(layout.choiceRows, 1);
  assert.ok(layout.choicesScrollWidth > layout.choicesClientWidth);
  assert.ok(
    layout.targets.every(
      (target) =>
        target.width >= 24 &&
        target.height >= 24 &&
        (target.isChoice ||
          (target.left >= 0 && target.right <= layout.viewportWidth))
    ),
    JSON.stringify(layout.targets)
  );
  await page.close();
});

test("[filters] result filter motion is removed when the user prefers reduced motion", async () => {
  const page = await newPage();
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" }
  ]);
  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "rust, ts generic source:all"
    )}&ui=en&docsLocale=en`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);
  await page.click("[data-result-filter-open]");
  const motion = await page.evaluate(() => {
    const controls = document.querySelector(".result-filter-controls");
    const panel = document.querySelector(".result-filter-panel");
    return {
      transitionDuration: getComputedStyle(controls).transitionDuration,
      animationName: getComputedStyle(panel).animationName
    };
  });
  assert.deepEqual(motion, {
    transitionDuration: "0s",
    animationName: "none"
  });
  await page.close();
});

test("[filters] adding a spaced second language enables its default sources", async () => {
  const page = await newPage();
  await gotoQuery(page, "rust generic", "&docsLocale=en");
  await waitForResults(page);

  let sourceState = await page.evaluate(() =>
    Object.fromEntries(
      ["rust-docs", "comprehensive-rust"].map((sourceId) => {
        const option = document.querySelector(
          `input[data-source-option][value="${sourceId}"]`
        );
        return [
          sourceId,
          { checked: option.checked, disabled: option.disabled }
        ];
      })
    )
  );
  assert.deepEqual(sourceState, {
    "rust-docs": { checked: true, disabled: false },
    "comprehensive-rust": { checked: false, disabled: true }
  });
  assert.ok(
    await page.$(
      'input[type="hidden"][data-preserved-source][value="comprehensive-rust"]'
    )
  );

  await page.$eval("[data-query-input]", (input) => {
    input.value = "rust, ts generic";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickAndWaitForClientNavigation(page, '.search-group button[type="submit"]');
  await waitForResults(page);

  assert.deepEqual(
    await page.$$eval(".fpill-label", (labels) =>
      labels.map((label) => label.textContent)
    ),
    ["Rust", "TypeScript"]
  );
  assert.deepEqual(
    new Set((await snapshot(page)).languages),
    new Set(["rust", "typescript"])
  );
  assert.deepEqual(
    new Set(
      await page.$$eval('input[name="sourceScopeLanguage"]', (inputs) =>
        inputs.map((input) => input.value)
      )
    ),
    new Set(["rust", "typescript"])
  );

  sourceState = await page.evaluate(() =>
    Object.fromEntries(
      [
        "rust-docs",
        "comprehensive-rust",
        "typescript-docs",
        "typescript-deep-dive"
      ].map((sourceId) => {
        const option = document.querySelector(
          `input[data-source-option][value="${sourceId}"]`
        );
        return [
          sourceId,
          { checked: option.checked, disabled: option.disabled }
        ];
      })
    )
  );
  assert.deepEqual(sourceState, {
    "rust-docs": { checked: true, disabled: false },
    "comprehensive-rust": { checked: false, disabled: true },
    "typescript-docs": { checked: true, disabled: false },
    "typescript-deep-dive": { checked: false, disabled: true }
  });

  await page.$eval("details.source-details", (details) => {
    details.open = true;
  });
  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="all"]'
  );
  await waitForResults(page);
  assert.equal(
    await page.$eval("details.source-details", (details) => details.open),
    true
  );
  sourceState = await page.evaluate(() =>
    Object.fromEntries(
      ["comprehensive-rust", "typescript-deep-dive"].map((sourceId) => {
        const option = document.querySelector(
          `input[data-source-option][value="${sourceId}"]`
        );
        return [
          sourceId,
          { checked: option.checked, disabled: option.disabled }
        ];
      })
    )
  );
  assert.deepEqual(sourceState, {
    "comprehensive-rust": { checked: true, disabled: false },
    "typescript-deep-dive": { checked: true, disabled: false }
  });
  const enabledSources = new Set((await snapshot(page)).sources);
  assert.ok(enabledSources.has("comprehensive-rust"));
  assert.ok(enabledSources.has("typescript-deep-dive"));
  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="fallback"]'
  );
  await waitForResults(page);
  assert.equal(
    await page.$eval("details.source-details", (details) => details.open),
    true
  );
  assert.deepEqual(
    await page.evaluate(() =>
      Object.fromEntries(
        ["comprehensive-rust", "typescript-deep-dive"].map((sourceId) => {
          const option = document.querySelector(
            `input[data-source-option][value="${sourceId}"]`
          );
          return [
            sourceId,
            { checked: option.checked, disabled: option.disabled }
          ];
        })
      )
    ),
    {
      "comprehensive-rust": { checked: false, disabled: true },
      "typescript-deep-dive": { checked: false, disabled: true }
    }
  );
  assert.equal(
    (await snapshot(page)).sources.some((sourceId) =>
      ["comprehensive-rust", "typescript-deep-dive"].includes(sourceId)
    ),
    false
  );
  await page.close();
});

test("[filters] enabling and disabling a non-official source changes the result list", async () => {
  const page = await newPage();
  await gotoQuery(
    page,
    "javascript proxy",
    "&docsLocale=en&sourcePolicy=official"
  );
  await waitForResults(page);
  assert.equal((await snapshot(page)).sources.includes("mdn-js"), false);
  assert.ok(
    (await snapshot(page)).sources.every((source) =>
      ["tc39-ecma262", "tc39-proposals"].includes(source)
    )
  );

  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="all"]'
  );
  await waitForResults(page);
  assert.ok((await snapshot(page)).sources.includes("mdn-js"));

  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="fallback"]'
  );
  await waitForResults(page);
  assert.equal((await snapshot(page)).sources.includes("mdn-js"), false);

  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="all"]'
  );
  await waitForResults(page);
  assert.ok((await snapshot(page)).sources.includes("mdn-js"));

  await page.$eval("details.source-details", (details) => { details.open = true; });
  await page.$eval('input[name="sourceId"][value="mdn-js"]', (input) => { input.checked = false; });
  await clickAndWaitForClientNavigation(page, '.search-group button[type="submit"]');
  await waitForResults(page);
  assert.equal((await snapshot(page)).sources.includes("mdn-js"), false);
  await page.close();
});

test("[catalog] documentation locale and UI locale switch independently", async () => {
  const page = await newPage();
  await gotoQuery(
    page,
    "python list",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
  );
  await waitForResults(page);
  assert.ok((await snapshot(page)).locales.every((locale) => locale === "en"));

  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documentRequests += 1;
    }
  });
  await page.evaluate(() => {
    document.documentElement.dataset.localeSwitchDocument = "preserved";
  });
  await page.$eval('[data-docs-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "ja" &&
      document.querySelector("[data-search-status]")?.dataset.state === "success"
  );
  let result = await snapshot(page);
  assert.equal(documentRequests, 0);
  assert.equal(
    await page.$eval("html", (html) => html.dataset.localeSwitchDocument),
    "preserved"
  );
  assert.equal(new URL(page.url()).searchParams.get("docsLocale"), "ja");
  assert.match(
    await page.evaluate(() => document.cookie),
    /(?:^|; )ods_docs_locale=ja(?:;|$)/
  );
  assert.ok(result.locales.every((locale) => locale === "ja"));
  assert.ok(result.links.every((link) => new URL(link.href).pathname.startsWith("/ja/")));

  await page.$eval('[data-ui-radio][value="ja"]', (radio) => radio.click());
  assert.equal(await page.$eval("html", (html) => html.lang), "ja");
  result = await snapshot(page);
  assert.ok(result.locales.every((locale) => locale === "ja"));
  await page.close();
});

test("[catalog] Japanese requests visibly fall back to English-only documentation", async () => {
  const page = await newPage();
  await gotoQuery(page, "rust iterator source:all", "&docsLocale=ja");
  await waitForResults(page);

  const result = await snapshot(page);
  assert.ok(result.locales.every((locale) => locale === "en"));
  const notice = await page.$eval("[data-index-coverage]", (element) => ({
    hidden: element.hidden,
    enSummary: element.querySelector(".lang-en .index-coverage-summary")?.textContent,
    jaSummary: element.querySelector(".lang-ja .index-coverage-summary")?.textContent,
    enSources: [...element.querySelectorAll(".lang-en .index-coverage-sources li")].map(
      (item) => item.textContent
    ),
    jaSources: [...element.querySelectorAll(".lang-ja .index-coverage-sources li")].map(
      (item) => item.textContent
    )
  }));
  assert.equal(notice.hidden, false);
  assert.equal(
    notice.enSummary,
    "The following sources do not have Japanese documentation, so English search results are shown."
  );
  assert.equal(
    notice.jaSummary,
    "次のソースは日本語版がないため、英語の検索結果を表示しています。"
  );
  assert.deepEqual(notice.enSources, [
    "Rust Documentation",
    "Comprehensive Rust"
  ]);
  assert.deepEqual(notice.jaSources, [
    "Rust Documentation",
    "Comprehensive Rust"
  ]);
  await page.close();
});

test("[catalog] fallback notices group one compact explanation with a semantic source list", async () => {
  const page = await newPage({ width: 375, height: 900 });
  await page.goto(`${app.baseUrl}/?ui=ja&docsLocale=ja`, {
    waitUntil: "domcontentloaded"
  });
  assert.equal(await page.$("[data-locale-notice]"), null);

  await page.goto(
    `${app.baseUrl}/?q=${encodeURIComponent(
      "rust,typescript type source:all"
    )}&ui=ja&docsLocale=ja`,
    { waitUntil: "domcontentloaded" }
  );
  await waitForResults(page);

  const notice = await page.$eval("[data-index-coverage]", (element) => {
    const visibleGroup = element.querySelector(".lang-ja");
    const summary = visibleGroup?.querySelector(".index-coverage-summary");
    const sourceList = visibleGroup?.querySelector(".index-coverage-sources");
    const style = getComputedStyle(element);
    return {
      summary: summary?.textContent,
      summaryCount: [
        ...(visibleGroup?.querySelectorAll(".index-coverage-summary") ?? [])
      ].length,
      sourceListTag: sourceList?.tagName,
      sources: [...(sourceList?.querySelectorAll("li") ?? [])].map(
        (item) => item.textContent
      ),
      sourceListTop: sourceList?.getBoundingClientRect().top,
      summaryBottom: summary?.getBoundingClientRect().bottom,
      repeatedCopy: visibleGroup?.textContent?.includes(
        "日本語ドキュメントは未対応のため"
      ),
      noticeBottom: element.getBoundingClientRect().bottom,
      resultCountTop: document
        .querySelector('[data-search-status][data-state="success"]')
        ?.getBoundingClientRect().top,
      fontSize: Number.parseFloat(style.fontSize),
      backgroundColor: style.backgroundColor,
      borderWidths: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth
      ]
    };
  });

  assert.equal(
    notice.summary,
    "次のソースは日本語版がないため、英語の検索結果を表示しています。"
  );
  assert.equal(notice.summaryCount, 1);
  assert.equal(notice.sourceListTag, "UL");
  assert.deepEqual(
    new Set(notice.sources),
    new Set([
      "Rust Documentation",
      "Comprehensive Rust",
      "TypeScript Documentation",
      "TypeScript Deep Dive"
    ])
  );
  assert.equal(notice.sources.length, 4);
  assert.ok(notice.sourceListTop > notice.summaryBottom);
  assert.equal(notice.repeatedCopy, false);
  assert.ok(notice.noticeBottom <= notice.resultCountTop);
  assert.ok(notice.fontSize <= 12);
  assert.equal(notice.backgroundColor, "rgba(0, 0, 0, 0)");
  assert.deepEqual(notice.borderWidths, ["0px", "0px", "0px", "0px"]);
  assert.equal(await page.$("[data-locale-notice]"), null);
  await page.close();
});

test("[catalog] a failed bundle is reported without discarding successful results", async () => {
  const page = await newPage();
  await disableSearchWorker(page);
  await page.setCacheEnabled(false);
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const pathname = new URL(request.url()).pathname;
    if (/^\/search-index\/rust-docs\.en\.[^.]+\.json$/.test(pathname)) {
      await request.respond({ status: 503, contentType: "application/json", body: "{}" });
    } else {
      await request.continue();
    }
  });

  await gotoQuery(
    page,
    "python,rust list source:official",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs&sourceId=rust-docs"
  );
  await waitForResults(page);
  const result = await snapshot(page);
  assert.ok(result.sources.includes("python-docs"));
  assert.equal(result.sources.includes("rust-docs"), false);
  const notice = await page.$eval("[data-index-coverage]", (element) => ({
    hidden: element.hidden,
    en: element.querySelector(".lang-en")?.textContent,
    ja: element.querySelector(".lang-ja")?.textContent
  }));
  assert.equal(notice.hidden, false);
  assert.match(notice.en, /Rust Documentation \(EN\).*other available results are shown/);
  assert.match(notice.ja, /Rust Documentation（EN）.*取得できた検索結果のみ表示/);
  await page.close();
});

test("[catalog] planned secondary sources are explicit while supported sources still return results", async () => {
  const page = await newPage();
  await gotoQuery(page, "haxe abstract", "&docsLocale=en");
  await waitForResults(page);
  const coverage = await page.$eval("[data-index-coverage]", (element) => ({
    hidden: element.hidden,
    text: element.textContent
  }));
  assert.equal(coverage.hidden, false);
  assert.match(coverage.text, /Haxe API/);
  assert.match(coverage.text, /index planned/);
  assert.ok((await snapshot(page)).sources.includes("haxe-manual"));
  await page.close();
});

test("[catalog] new TypeScript and C# indexes participate in one combined search", async () => {
  const page = await newPage();
  await gotoQuery(page, "typescript,csharp generics source:official", "&docsLocale=en");
  await waitForResults(page);
  const result = await snapshot(page);

  assert.deepEqual(new Set(result.languages), new Set(["typescript", "csharp"]));
  assert.deepEqual(
    new Set(result.links.map((link) => new URL(link.href).hostname)),
    new Set(["www.typescriptlang.org", "learn.microsoft.com"])
  );
  await page.close();
});

test("[catalog] new PHP and Ruby indexes expose their Japanese documentation locale", async () => {
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

test(
  "[catalog] every catalog language returns a real result through its supported index",
  { timeout: 120_000 },
  async () => {
    const supported = searchManifest.entries.filter((entry) => entry.status === "supported");
    const languageIds = [...new Set(searchManifest.entries.map((entry) => entry.programmingLanguage))];
    const selected = languageIds.map((language) => {
      const candidates = supported.filter((entry) => entry.programmingLanguage === language);
      return (
        candidates.find(
          (entry) => entry.docsLocale === "en" && entry.sourceKind === "official"
        ) ??
        candidates.find((entry) => entry.docsLocale === "en") ??
        candidates[0]
      );
    });
    assert.equal(selected.filter(Boolean).length, languageIds.length);

    for (const entry of selected) {
      const page = await newPage();
      const query = entry.knownQueries?.[0];
      assert.ok(query, `${entry.programmingLanguage} must have a known query`);
      const sourceFlag =
        entry.sourceKind === "official" ? " source:official" : " source:all";
      await gotoQuery(
        page,
        `lang:${entry.programmingLanguage} ${query}${sourceFlag}`,
        `&docsLocale=${entry.docsLocale}`
      );
      await waitForResults(page);
      try {
        await page.waitForFunction(
          ({ language, sourceId }) =>
            [...document.querySelectorAll(".result-item")].some(
              (item) =>
                item.dataset.language === language &&
                (item.dataset.sourceIds ?? item.dataset.sourceId ?? "")
                  .split(" ")
                  .includes(sourceId)
            ),
          { timeout: 20_000 },
          { language: entry.programmingLanguage, sourceId: entry.sourceId }
        );
      } catch {
        const diagnostic = await page.evaluate(() => ({
          state: document.querySelector("[data-search-status]")?.getAttribute("data-state"),
          status: document.querySelector("[data-search-status]")?.textContent,
          sources: [...document.querySelectorAll(".result-item")].map(
            (item) => item.getAttribute("data-source-ids")
          ),
          coverage: document.querySelector("[data-index-coverage]")?.textContent
        }));
        assert.fail(
          `${entry.programmingLanguage}/${entry.sourceId} did not render: ${JSON.stringify(diagnostic)}`
        );
      }
      const result = await snapshot(page);
      assert.ok(
        result.languages.includes(entry.programmingLanguage),
        `${entry.programmingLanguage}: ${query}`
      );
      assert.ok(result.sources.includes(entry.sourceId), `${entry.sourceId}: ${query}`);
      await page.close();
    }
  }
);

test(
  "[catalog] every supported Japanese index and every English fallback stays truthful",
  { timeout: 120_000 },
  async () => {
    const supported = searchManifest.entries.filter((entry) => entry.status === "supported");
    const japanese = supported.filter((entry) => entry.docsLocale === "ja");
    assert.equal(japanese.length, 18);

    for (const entry of japanese) {
      const page = await newPage();
      const sourceFlag =
        entry.sourceKind === "official" ? "source:official" : "source:all";
      await gotoQuery(
        page,
        `lang:${entry.programmingLanguage} ${entry.knownQueries[0]} ${sourceFlag}`,
        `&docsLocale=ja&sourceSelection=explicit&sourceId=${encodeURIComponent(entry.sourceId)}`
      );
      await waitForResults(page);
      const result = await snapshot(page);
      assert.ok(result.sources.includes(entry.sourceId), entry.sourceId);
      assert.ok(result.locales.every((locale) => locale === "ja"), entry.sourceId);
      await page.close();
    }

    const languageIds = [...new Set(supported.map((entry) => entry.programmingLanguage))];
    const fallbackLanguages = languageIds.filter(
      (language) =>
        !supported.some(
          (entry) =>
            entry.programmingLanguage === language && entry.docsLocale === "ja"
        )
    );
    assert.equal(fallbackLanguages.length, 27);

    for (const language of fallbackLanguages) {
      const entry =
        supported.find(
          (candidate) =>
            candidate.programmingLanguage === language &&
            candidate.docsLocale === "en" &&
            candidate.sourceKind === "official"
        ) ??
        supported.find(
          (candidate) =>
            candidate.programmingLanguage === language &&
            candidate.docsLocale === "en"
        );
      assert.ok(entry, language);
      const page = await newPage();
      const sourceFlag =
        entry.sourceKind === "official" ? "source:official" : "source:all";
      await gotoQuery(
        page,
        `lang:${language} ${entry.knownQueries[0]} ${sourceFlag}`,
        "&docsLocale=ja"
      );
      await waitForResults(page);
      const result = await snapshot(page);
      assert.ok(result.sources.includes(entry.sourceId), entry.sourceId);
      assert.ok(result.locales.every((locale) => locale === "en"), entry.sourceId);
      assert.match(
        await page.$eval("[data-index-coverage]", (element) => element.textContent),
        /English search results are shown/
      );
      await page.close();
    }
  }
);

test("[catalog] qualified editions are visibly labeled in results", async () => {
  const page = await newPage();
  await gotoQuery(
    page,
    "lang:sql SQL ステートメント source:official",
    "&docsLocale=ja"
  );
  await waitForResults(page);
  assert.match(
    await page.$eval(
      "[data-result-source-notes]",
      (element) => element.textContent
    ),
    /Machine-translated MySQL 8\.0/
  );
  await page.close();
});

test("[catalog] trusted non-official caveats are localized in the source picker and results", async () => {
  const page = await newPage();
  await gotoQuery(
    page,
    "lang:typescript strictNullChecks source:all",
    "&docsLocale=en"
  );
  await waitForResults(page);
  await page.$eval("details.source-details", (details) => {
    details.open = true;
  });

  const readVisibleCaveats = () => page.evaluate(() => {
    const source = document
      .querySelector('input[value="typescript-deep-dive"]')
      ?.closest(".source-option");
    const result = document.querySelector("[data-result-source-notes]");
    const resultDetails = result?.querySelector("details");
    if (resultDetails) {
      resultDetails.open = true;
    }
    const visibleText = (root, selector) => {
      const element = root?.querySelector(selector);
      return element && element.getClientRects().length > 0
        ? element.textContent
        : undefined;
    };
    const meta = source?.querySelector(".source-meta");
    const sourceLink = source?.querySelector(".source-link");
    const sourceTitle = source?.querySelector(".source-title");
    const sourceKind = source?.querySelector(".source-kind");
    const unavailable = source?.querySelector(".source-ja-unavailable");
    const rectTop = (element) => element?.getBoundingClientRect().top;
    const computedColors = (element) => {
      if (!element) return undefined;
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderColor,
        color: style.color
      };
    };
    return {
      sourceEn: visibleText(source, ".source-qualification .lang-en"),
      sourceJa: visibleText(source, ".source-qualification .lang-ja"),
      resultEn: visibleText(result, "li .lang-en"),
      resultJa: visibleText(result, "li .lang-ja"),
      unavailableEn: visibleText(source, ".source-ja-unavailable .lang-en"),
      unavailableJa: visibleText(source, ".source-ja-unavailable .lang-ja"),
      metadataOrder: [...(meta?.children ?? [])].map((element) => element.className),
      inlineMetadata: {
        titleTop: rectTop(sourceTitle),
        kindTop: rectTop(sourceKind),
        linkTop: rectTop(sourceLink)
      },
      kindColors: computedColors(sourceKind),
      unavailableColors: computedColors(unavailable),
      link: sourceLink
        ? {
            href: sourceLink.href,
            target: sourceLink.target,
            rel: sourceLink.rel
          }
        : undefined
    };
  });

  let caveats = await readVisibleCaveats();
  assert.match(caveats.sourceEn ?? "", /^Note: .*classic deep guide/i);
  assert.equal(caveats.sourceJa, undefined);
  assert.match(caveats.resultEn ?? "", /^Note: .*classic deep guide/i);
  assert.equal(caveats.resultJa, undefined);
  assert.equal(caveats.unavailableEn, undefined);
  assert.equal(caveats.unavailableJa, undefined);
  assert.deepEqual(caveats.metadataOrder, [
    "source-kind",
    "source-link",
    "source-ja-unavailable"
  ]);
  assert.ok(Math.abs(caveats.inlineMetadata.titleTop - caveats.inlineMetadata.kindTop) <= 4);
  assert.ok(Math.abs(caveats.inlineMetadata.titleTop - caveats.inlineMetadata.linkTop) <= 4);
  assert.equal(new URL(caveats.link.href).hostname, "basarat.gitbook.io");
  assert.equal(caveats.link.target, "_blank");
  assert.match(caveats.link.rel, /noopener/);

  await page.$eval('[data-docs-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "ja" &&
      document.querySelector("[data-search-status]")?.dataset.state === "success"
  );
  caveats = await readVisibleCaveats();
  assert.equal(caveats.unavailableEn, "No Japanese version");
  assert.equal(caveats.unavailableJa, undefined);
  assert.deepEqual(caveats.unavailableColors, caveats.kindColors);
  assert.equal(await page.$("[data-locale-notice]"), null);

  await page.$eval('[data-ui-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(() => document.documentElement.lang === "ja");
  caveats = await readVisibleCaveats();
  assert.equal(caveats.sourceEn, undefined);
  assert.match(caveats.sourceJa ?? "", /^補足：/);
  assert.equal(caveats.resultEn, undefined);
  assert.match(caveats.resultJa ?? "", /^補足：/);
  assert.equal(caveats.unavailableEn, undefined);
  assert.equal(caveats.unavailableJa, "日本語未対応");
  assert.equal(await page.$("[data-locale-notice]"), null);
  await page.close();
});

test("[catalog] every admitted non-official source renders a qualified safe result and Japanese fallback", async () => {
  const page = await newPage();
  for (const sourceId of trustedCommunitySourceIds) {
    const entry = searchManifest.entries.find(
      (candidate) =>
        candidate.sourceId === sourceId &&
        candidate.docsLocale === "en" &&
        candidate.status === "supported"
    );
    assert.ok(entry, `${sourceId}: missing supported manifest entry`);
    assert.ok(entry.knownQueries?.[0], `${sourceId}: missing known query`);

    await gotoQuery(
      page,
      `lang:${entry.programmingLanguage} ${entry.knownQueries[0]} source:all`,
      `&docsLocale=ja&sourceSelection=explicit&sourceId=${encodeURIComponent(sourceId)}`
    );
    await waitForResults(page);
    const rendered = await page.evaluate((expectedSourceId) => {
      const item = [...document.querySelectorAll(".result-item")].find(
        (candidate) =>
          (candidate.dataset.sourceIds ?? candidate.dataset.sourceId ?? "")
            .split(" ")
            .includes(expectedSourceId)
      );
      const link =
        item?.querySelector(`[data-result-source-id="${expectedSourceId}"]`) ??
        item?.querySelector(".result-group-source");
      const sourceOption = document
        .querySelector(`input[value="${expectedSourceId}"]`)
        ?.closest(".source-option");
      return {
        docsLocale: item?.getAttribute("data-docs-locale"),
        href: link?.href,
        target: link?.target,
        rel: link?.rel,
        resultQualification:
          document.querySelector("[data-result-source-notes] li .lang-en")
            ?.textContent,
        sourceQualification:
          sourceOption?.querySelector(".source-qualification .lang-en")?.textContent,
        fallback: document.querySelector("[data-index-coverage] .lang-en")?.textContent
      };
    }, sourceId);

    assert.equal(rendered.docsLocale, "en", sourceId);
    assert.equal(new URL(rendered.href).protocol, "https:", sourceId);
    assert.equal(rendered.target, "_blank", sourceId);
    assert.match(rendered.rel ?? "", /noopener/, sourceId);
    assert.match(rendered.resultQualification ?? "", /^Note: /, sourceId);
    assert.match(rendered.sourceQualification ?? "", /^Note: /, sourceId);
    assert.match(rendered.fallback ?? "", /English search results are shown/, sourceId);
  }
  await page.close();
});

test("[catalog] blocked and disabled index states are distinguishable", async () => {
  const blockedPage = await newPage();
  await gotoQuery(blockedPage, "objc Fast Enumeration", "&docsLocale=en");
  await waitForResults(blockedPage);
  assert.ok((await snapshot(blockedPage)).sources.includes("gnu-objc"));
  assert.match(
    await blockedPage.$eval("[data-index-coverage]", (element) => element.textContent),
    /index unavailable/
  );
  await blockedPage.close();

  const disabledPage = await newPage();
  await gotoQuery(disabledPage, "commonlisp mapcar source:all", "&docsLocale=en");
  await waitForResults(disabledPage);
  assert.ok((await snapshot(disabledPage)).sources.includes("cl-language-reference"));
  assert.match(
    await disabledPage.$eval("[data-index-coverage]", (element) => element.textContent),
    /index disabled/
  );
  await disabledPage.close();
});

test("[catalog] empty and index-load failure states are explicit", async () => {
  const noSourcesPage = await newPage();
  let manifestRequests = 0;
  await noSourcesPage.setRequestInterception(true);
  noSourcesPage.on("request", async (request) => {
    if (new URL(request.url()).pathname === "/search-index/runtime-manifest.json") {
      manifestRequests += 1;
    }
    await request.continue();
  });
  await noSourcesPage.goto(
    `${app.baseUrl}/?q=${encodeURIComponent("python list")}&ui=en&sourceSelection=explicit`,
    { waitUntil: "domcontentloaded" }
  );
  await noSourcesPage.waitForSelector(
    '[data-search-status][data-state="empty"][data-empty-reason="no-sources"]'
  );
  const noSourcesStatus = await noSourcesPage.$eval("[data-search-status]", (status) => ({
    tag: status.tagName,
    className: status.className,
    role: status.getAttribute("role"),
    text: status.textContent
  }));
  assert.match(noSourcesStatus.text, /Select at least one search source/);
  assert.equal(manifestRequests, 0);
  await noSourcesPage.close();

  const emptyPage = await newPage();
  await gotoQuery(emptyPage, "python zzz-no-such-document-zzz", "&docsLocale=en");
  await emptyPage.waitForSelector(
    '[data-search-status][data-state="empty"][data-empty-reason="no-results"]'
  );
  const noResultsStatus = await emptyPage.$eval("[data-search-status]", (status) => ({
    tag: status.tagName,
    className: status.className,
    role: status.getAttribute("role"),
    text: status.textContent
  }));
  assert.match(noResultsStatus.text, /No results/);
  assert.deepEqual(
    {
      tag: noSourcesStatus.tag,
      className: noSourcesStatus.className,
      role: noSourcesStatus.role
    },
    {
      tag: noResultsStatus.tag,
      className: noResultsStatus.className,
      role: noResultsStatus.role
    }
  );
  await emptyPage.close();

  const errorPage = await newPage();
  await disableSearchWorker(errorPage);
  await errorPage.setRequestInterception(true);
  errorPage.on("request", async (request) => {
    if (new URL(request.url()).pathname === "/search-index/runtime-manifest.json") {
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

test("[layout] results stay visible at desktop and mobile widths", async () => {
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

test("[layout] contextual search help, centered header, and right-aligned settings stay predictable", async () => {
  for (const width of [1280, 641, 390, 375, 320]) {
    const page = await newPage({ width, height: 900 });
    await page.goto(
      `${app.baseUrl}/?q=${encodeURIComponent(
        "lang:typescript strictNullChecks source:all"
      )}&docsLocale=ja&ui=ja`,
      { waitUntil: "domcontentloaded" }
    );
    await waitForResults(page);
    const pageIdentity = await page.evaluate(() => ({
      href: location.href,
      timeOrigin: performance.timeOrigin
    }));
    await page.$eval("details.source-details", (details) => {
      details.open = true;
    });
    assert.equal(
      await page.$eval(".source-details summary .lang-ja", (element) => element.textContent),
      "ソース"
    );
    const layout = await page.evaluate(() => {
      const header = document.querySelector(".search-header").getBoundingClientRect();
      const title = document.querySelector(".search-header h1").getBoundingClientRect();
      const actions = document.querySelector(".header-actions").getBoundingClientRect();
      const help = document.querySelector("[data-help-open]").getBoundingClientRect();
      const searchGroup = document.querySelector(".search-group").getBoundingClientRect();
      const query = document.querySelector("[data-query-input]").getBoundingClientRect();
      const search = document.querySelector(".search-submit").getBoundingClientRect();
      const language = document.querySelector(".lang-switch").getBoundingClientRect();
      const controls = document.querySelector(".controls-row").getBoundingClientRect();
      const sourcePolicyToggle = document
        .querySelector(".source-policy-toggle")
        .getBoundingClientRect();
      const sourcePolicySetting = document
        .querySelector(".source-policy-setting")
        .getBoundingClientRect();
      const sourcePolicyLabel = document
        .querySelector("#source-policy-label")
        .getBoundingClientRect();
      const docsLabel = document.querySelector("#docs-locale-label").getBoundingClientRect();
      const docsToggle = document
        .querySelector(".docs-setting-row .seg-toggle")
        .getBoundingClientRect();
      const docsSetting = document
        .querySelector(".docs-setting-row")
        .getBoundingClientRect();
      const sourcePolicyLabelStyle = getComputedStyle(
        document.querySelector("#source-policy-label")
      );
      const docsLabelStyle = getComputedStyle(
        document.querySelector("#docs-locale-label")
      );
      const sourcePolicyChoiceRects = [
        ...document.querySelectorAll(".source-policy-toggle .seg-btn")
      ].map((choice) => choice.getBoundingClientRect());
      const summaryStyle = getComputedStyle(document.querySelector(".source-details summary"));
      const titleStyle = getComputedStyle(document.querySelector(".source-title"));
      const optionStyle = getComputedStyle(document.querySelector(".source-option"));
      const gridStyle = getComputedStyle(document.querySelector(".source-grid"));
      const summaryRect = document.querySelector(".source-details summary").getBoundingClientRect();
      const titleRect = document.querySelector(".source-title").getBoundingClientRect();
      const sourceLinkRect = document.querySelector(".source-link").getBoundingClientRect();
      const sourceToggleRect = document.querySelector("[data-source-option]").getBoundingClientRect();
      const sourceOptionElement = document.querySelector("[data-source-option]");
      const checkedToggleBackground = getComputedStyle(sourceOptionElement).backgroundColor;
      const headerStyle = getComputedStyle(document.querySelector(".search-header"));
      const languageHighlightStyle = getComputedStyle(
        document.querySelector(".query-highlight .flag-token")
      );
      const uncheckedToggle = sourceOptionElement.cloneNode();
      uncheckedToggle.checked = false;
      uncheckedToggle.style.transition = "none";
      document.body.append(uncheckedToggle);
      const uncheckedToggleBackground = getComputedStyle(uncheckedToggle).backgroundColor;
      uncheckedToggle.remove();
      return {
        rightGap: Math.abs(header.right - actions.right),
        titleCenterGap: Math.abs(
          title.left + title.width / 2 - (header.left + header.width / 2)
        ),
        languageAboveTitle: actions.bottom <= title.top,
        languageRightGap: Math.abs(header.right - language.right),
        actionTags: [...document.querySelector(".header-actions").children].map(
          (element) => element.tagName
        ),
        queryBeforeSearch: query.right <= search.left,
        searchBeforeHelp: search.right <= help.left,
        helpRightGap: Math.abs(searchGroup.right - help.right),
        queryWidth: query.width,
        helpWidth: help.width,
        helpHeight: help.height,
        pageOverflows: document.documentElement.scrollWidth > window.innerWidth,
        controlsWidth: controls.width,
        sourcePolicyRightGap: Math.abs(controls.right - sourcePolicyToggle.right),
        sourcePolicyWidth: sourcePolicyToggle.width,
        docsAboveSourcePolicy: docsSetting.bottom <= sourcePolicySetting.top,
        sourcePolicyLabelBesideToggle:
          sourcePolicyLabel.right <= sourcePolicyToggle.left &&
          Math.abs(
            sourcePolicyLabel.top +
              sourcePolicyLabel.height / 2 -
              (sourcePolicyToggle.top + sourcePolicyToggle.height / 2)
          ) <= 1,
        sourcePolicyLabels: [
          ...document.querySelectorAll(".source-policy-toggle .seg-btn")
        ].map((label) => label.innerText.trim()),
        sourcePolicyChoiceWidths: sourcePolicyChoiceRects.map(
          (choice) => choice.width
        ),
        sourcePolicyChoicesOverlap: sourcePolicyChoiceRects.some(
          (choice, index) =>
            index > 0 && sourcePolicyChoiceRects[index - 1].right > choice.left
        ),
        sourcePolicyLabelStyle: {
          color: sourcePolicyLabelStyle.color,
          fontSize: sourcePolicyLabelStyle.fontSize,
          fontWeight: sourcePolicyLabelStyle.fontWeight
        },
        docsLabelStyle: {
          color: docsLabelStyle.color,
          fontSize: docsLabelStyle.fontSize,
          fontWeight: docsLabelStyle.fontWeight
        },
        selectedSourcePolicy: document.querySelector(
          "[data-source-policy-radio]:checked"
        )?.value,
        docsToggleRightGap: Math.abs(controls.right - docsToggle.right),
        docsLabelGap: docsToggle.left - docsLabel.right,
        sourcePolicyLabelledBy: document
          .querySelector(".source-policy-toggle")
          .getAttribute("aria-labelledby"),
        sourcePolicyLabelText: document
          .querySelector("#source-policy-label .lang-ja")
          .textContent,
        docsLabelText: document
          .querySelector("#docs-locale-label .lang-ja")
          .textContent,
        summaryFont: Number.parseFloat(summaryStyle.fontSize),
        titleFont: Number.parseFloat(titleStyle.fontSize),
        optionPaddingTop: Number.parseFloat(optionStyle.paddingTop),
        rowGap: Number.parseFloat(gridStyle.rowGap),
        gridColumns: gridStyle.gridTemplateColumns.trim().split(/\s+/).length,
        summaryHeight: summaryRect.height,
        titleHeight: titleRect.height,
        sourceLinkHeight: sourceLinkRect.height,
        sourceToggleHeight: sourceToggleRect.height,
        checkedToggleBackground,
        uncheckedToggleBackground,
        headerBorderBottomWidth: headerStyle.borderBottomWidth,
        languageHighlightBackground: languageHighlightStyle.backgroundColor
      };
    });
    assert.ok(layout.rightGap <= 1, `header actions right gap was ${layout.rightGap}px at ${width}px`);
    assert.ok(
      layout.titleCenterGap <= 1,
      `title center gap was ${layout.titleCenterGap}px at ${width}px`
    );
    assert.deepEqual(layout.actionTags, ["FIELDSET"]);
    assert.equal(layout.queryBeforeSearch, true);
    assert.equal(layout.searchBeforeHelp, true);
    assert.ok(layout.helpRightGap <= 1, `help right gap was ${layout.helpRightGap}px at ${width}px`);
    assert.ok(layout.queryWidth >= 140, `query width was ${layout.queryWidth}px at ${width}px`);
    assert.ok(layout.helpWidth >= 44);
    assert.ok(layout.helpHeight >= 44);
    assert.equal(layout.pageOverflows, false);
    assert.equal(layout.sourcePolicyLabelledBy, "source-policy-label");
    assert.equal(layout.sourcePolicyLabelText, "非公式ソース");
    assert.equal(layout.docsLabelText, "Docs");
    assert.deepEqual(layout.sourcePolicyLabels, [
      "含めない",
      "公式がない時だけ",
      "含める"
    ]);
    assert.equal(layout.sourcePolicyChoicesOverlap, false);
    assert.deepEqual(layout.sourcePolicyLabelStyle, layout.docsLabelStyle);
    assert.equal(layout.selectedSourcePolicy, "all");
    if (width <= 760) {
      assert.equal(layout.languageAboveTitle, true);
      assert.ok(layout.sourcePolicyRightGap <= 1);
      assert.ok(
        layout.sourcePolicyWidth < layout.controlsWidth,
        `source policy width was ${layout.sourcePolicyWidth}px at ${width}px`
      );
      assert.equal(layout.docsAboveSourcePolicy, true);
      assert.equal(layout.sourcePolicyLabelBesideToggle, true);
      assert.ok(
        layout.sourcePolicyChoiceWidths[0] <= 56,
        `exclude choice width was ${layout.sourcePolicyChoiceWidths[0]}px at ${width}px`
      );
      assert.ok(layout.docsToggleRightGap <= 1);
      assert.ok(layout.languageRightGap <= 1);
      assert.ok(layout.docsLabelGap >= 0 && layout.docsLabelGap <= 8);
    }
    assert.ok(layout.summaryFont <= 14, `source summary font was ${layout.summaryFont}px`);
    assert.ok(layout.titleFont <= 13, `source title font was ${layout.titleFont}px`);
    assert.ok(layout.optionPaddingTop <= 7, `source option padding was ${layout.optionPaddingTop}px`);
    assert.ok(layout.rowGap <= 6, `source grid gap was ${layout.rowGap}px`);
    assert.equal(layout.gridColumns, 1, `source grid had ${layout.gridColumns} columns at ${width}px`);
    assert.ok(layout.summaryHeight >= 24);
    assert.ok(layout.titleHeight >= 24);
    assert.ok(layout.sourceLinkHeight >= 24);
    assert.ok(layout.sourceToggleHeight >= 24);
    assert.equal(layout.checkedToggleBackground, "rgb(28, 31, 35)");
    assert.equal(layout.uncheckedToggleBackground, "rgb(100, 107, 117)");
    assert.equal(layout.headerBorderBottomWidth, "0px");
    assert.equal(layout.languageHighlightBackground, "rgb(249, 248, 51)");
    const settingsBeforeTextClicks = await page.evaluate(() => ({
      policy: document.querySelector("[data-source-policy-radio]:checked").value
    }));
    await page.click("#source-policy-label");
    assert.deepEqual(
      await page.evaluate(() => ({
        policy: document.querySelector("[data-source-policy-radio]:checked").value,
        href: location.href,
        timeOrigin: performance.timeOrigin
      })),
      {
        ...settingsBeforeTextClicks,
        ...pageIdentity
      }
    );
    await page.focus('[data-docs-radio][value="en"]');
    const docsFocus = await page.$eval(
      '[data-docs-radio][value="en"]',
      (radio) => {
        const style = getComputedStyle(radio.closest(".seg-btn"));
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth)
        };
      }
    );
    assert.equal(docsFocus.outlineStyle, "solid");
    assert.ok(docsFocus.outlineWidth >= 2);
    await page.close();
  }
});

test("[layout] result hierarchy, shared badges, input chips, and count stay visually distinct", async () => {
  for (const width of [1280, 375]) {
    const page = await newPage({ width, height: 900 });
    await gotoQuery(
      page,
      "lang:typescript strictNullChecks source:all",
      "&docsLocale=en"
    );
    await waitForResults(page);
    const layout = await page.evaluate(() => {
      const item = document.querySelector(
        '.result-item[data-source-id="typescript-deep-dive"]'
      );
      const titleRow = item.querySelector(".result-title-row");
      const title = titleRow.querySelector("h2");
      const languageTag = titleRow.querySelector(".result-language-tag");
      const resultKind = item.querySelector(".result-group-source-meta .source-kind");
      const sourceKind = document
        .querySelector('input[value="typescript-deep-dive"]')
        .closest(".source-option")
        .querySelector(".source-kind");
      const sourceLink = item.querySelector(".result-group-source");
      const sourceName = item.querySelector(".result-source-name");
      const domain = item.querySelector(".result-group-source-domain");
      const qualification = document.querySelector(
        "[data-result-source-notes] li span"
      );
      const chip = document.querySelector(".fpill");
      const chipLabel = document.querySelector(".fpill-label");
      const chipRemove = document.querySelector(".fpill-x");
      const status = document.querySelector('[data-search-status][data-state="success"]');
      const results = document.querySelector(".results");
      const styles = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          fontSize: Number.parseFloat(style.fontSize),
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          borderTopWidth: style.borderTopWidth,
          borderLeftWidth: style.borderLeftWidth,
          borderColor: style.borderColor,
          padding: style.padding,
          minHeight: style.minHeight,
          width: rect.width,
          height: rect.height
        };
      };
      return {
        childOrder: [...item.children].map((element) =>
          element.className
        ),
        titleRowOrder: [...titleRow.children].map(
          (element) => element.tagName === "H2" ? "result-title" : element.className
        ),
        titleLinkCount: title.querySelectorAll("a").length,
        sourceLinkCount: item.querySelectorAll(".result-group-source").length,
        sourceLinkTarget: sourceLink.target,
        sourceLinkRel: sourceLink.rel,
        languageColor: getComputedStyle(languageTag)
          .getPropertyValue("--language-color")
          .trim(),
        languageTextColor: getComputedStyle(languageTag)
          .getPropertyValue("--language-text-color")
          .trim(),
        languageMarkerContent: getComputedStyle(languageTag, "::before").content,
        resultKind: styles(resultKind),
        sourceKind: styles(sourceKind),
        title: styles(title),
        languageTag: styles(languageTag),
        sourceName: styles(sourceName),
        domain: styles(domain),
        qualification: styles(qualification),
        chip: styles(chip),
        chipLabel: styles(chipLabel),
        chipRemove: styles(chipRemove),
        status: styles(status),
        resultsWidth: results.getBoundingClientRect().width,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
      };
    });

    assert.deepEqual(layout.childOrder, [
      "result-title-row",
      "result-group-sources"
    ]);
    assert.deepEqual(layout.titleRowOrder, [
      "result-title",
      "result-language-tag"
    ]);
    assert.equal(layout.titleLinkCount, 0);
    assert.equal(layout.sourceLinkCount, 1);
    assert.equal(layout.sourceLinkTarget, "_blank");
    assert.match(layout.sourceLinkRel, /noopener/);
    assert.equal(layout.languageColor.toLowerCase(), "#3178c6");
    assert.equal(layout.languageTextColor, "#ffffff");
    assert.equal(layout.languageMarkerContent, "none");
    assert.equal(layout.languageTag.backgroundColor, "rgb(49, 120, 198)");
    assert.equal(layout.languageTag.color, "rgb(255, 255, 255)");
    assert.equal(layout.resultKind.backgroundColor, layout.sourceKind.backgroundColor);
    assert.equal(layout.resultKind.borderRadius, layout.sourceKind.borderRadius);
    assert.equal(layout.resultKind.borderColor, layout.sourceKind.borderColor);
    assert.equal(layout.resultKind.borderTopWidth, layout.sourceKind.borderTopWidth);
    assert.equal(layout.resultKind.padding, layout.sourceKind.padding);
    assert.equal(layout.resultKind.minHeight, layout.sourceKind.minHeight);
    assert.ok(layout.title.fontSize >= layout.qualification.fontSize + 5);
    assert.ok(layout.title.fontSize > layout.sourceName.fontSize);
    assert.ok(layout.sourceName.fontSize > layout.domain.fontSize);
    assert.notEqual(layout.title.color, layout.qualification.color);
    assert.notEqual(layout.languageTag.backgroundColor, "rgba(0, 0, 0, 0)");
    assert.ok(layout.chip.height <= 30, `chip height was ${layout.chip.height}px at ${width}px`);
    assert.ok(Number.parseFloat(layout.chip.borderRadius) >= layout.chip.height / 2);
    assert.equal(layout.chipLabel.backgroundColor, "rgb(49, 120, 198)");
    assert.equal(layout.chipLabel.color, "rgb(255, 255, 255)");
    assert.equal(layout.chipRemove.backgroundColor, "rgb(245, 246, 247)");
    assert.notEqual(layout.chipRemove.backgroundColor, layout.chipLabel.backgroundColor);
    assert.equal(layout.chipRemove.borderLeftWidth, "1px");
    assert.ok(layout.chipRemove.width >= 24 && layout.chipRemove.height >= 24);
    assert.ok(layout.chipRemove.fontSize >= 16);
    assert.equal(layout.status.borderTopWidth, "0px");
    assert.equal(layout.status.backgroundColor, "rgba(0, 0, 0, 0)");
    assert.ok(layout.status.width < layout.resultsWidth / 2);
    assert.ok(layout.status.fontSize < layout.title.fontSize);
    assert.equal(layout.horizontalOverflow, false);

    if (width === 1280) {
      await page.focus("[data-remove-tag]");
      const focusStyle = await page.$eval("[data-remove-tag]", (element) => {
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          outlineOffset: Number.parseFloat(style.outlineOffset)
        };
      });
      assert.equal(focusStyle.outlineStyle, "solid");
      assert.ok(focusStyle.outlineWidth >= 2);
      assert.ok(focusStyle.outlineOffset < 0);
      const pageLoadCount = await armClientPageLoadCounter(page);
      await page.keyboard.press("Enter");
      await waitForClientPageLoad(page, pageLoadCount);
      assert.doesNotMatch(new URL(page.url()).searchParams.get("q"), /lang:typescript/);
    }
    await page.close();
  }
});

test("[performance] documentation locale switch avoids navigation and meets cold and warm budgets", async () => {
  const page = await newPage({ width: 390, height: 800 });
  await page.emulateCPUThrottling(4);
  await page.emulateNetworkConditions(PredefinedNetworkConditions["Fast 3G"]);
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(() => {
    globalThis.__odsLongTasks = [];
    new PerformanceObserver((list) => {
      globalThis.__odsLongTasks.push(
        ...list.getEntries().map((entry) => ({ startTime: entry.startTime, duration: entry.duration }))
      );
    }).observe({ type: "longtask", buffered: true });
  });

  await gotoQuery(
    page,
    "python list",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
  );
  await waitForResults(page);
  const timeOrigin = await page.evaluate(() => {
    document.documentElement.dataset.performanceDocument = "preserved";
    return performance.timeOrigin;
  });

  const coldStartedAt = performance.now();
  await page.$eval('[data-docs-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "ja" &&
      document.querySelector("[data-search-status]")?.dataset.state === "success",
    { timeout: 20_000 }
  );
  const coldDuration = performance.now() - coldStartedAt;

  const warmStartedAt = performance.now();
  await page.$eval('[data-docs-radio][value="en"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "en" &&
      document.querySelector("[data-search-status]")?.dataset.state === "success",
    { timeout: 20_000 }
  );
  const warmDuration = performance.now() - warmStartedAt;

  const performanceResult = await page.evaluate(() => {
    const startedAt = performance.getEntriesByName("ods-search-start").at(-1)?.startTime ?? 0;
    const duration = Number(
      document.querySelector("[data-search-results]")?.dataset.searchDurationMs ?? "Infinity"
    );
    const searchLongTasks = (globalThis.__odsLongTasks ?? []).filter(
      (entry) => entry.startTime >= startedAt && entry.duration > 50
    );
    return {
      duration,
      searchLongTasks,
      timeOrigin: performance.timeOrigin,
      marker: document.documentElement.dataset.performanceDocument
    };
  });

  assert.ok(coldDuration <= 1_500, `cold locale switch took ${coldDuration}ms`);
  assert.ok(warmDuration <= 500, `warm locale switch took ${warmDuration}ms`);
  assert.ok(performanceResult.duration <= 500, `recorded warm search took ${performanceResult.duration}ms`);
  assert.equal(performanceResult.timeOrigin, timeOrigin);
  assert.equal(performanceResult.marker, "preserved");
  assert.deepEqual(performanceResult.searchLongTasks, []);
  await page.close();
});

test("[performance] Docs locale intent warms one request and the click reuses it", async () => {
  const japaneseIndexPath = searchManifest.entries.find(
    (entry) =>
      entry.sourceId === "python-docs" &&
      entry.docsLocale === "ja" &&
      entry.status === "supported"
  )?.path;
  assert.ok(japaneseIndexPath);

  const page = await newPage();
  await page.setRequestInterception(true);
  let japaneseIndexRequests = 0;
  let releaseFirstRequest;
  const firstRequestGate = new Promise((resolveGate) => {
    releaseFirstRequest = resolveGate;
  });
  let observeFirstRequest;
  const firstRequestObserved = new Promise((resolveRequest) => {
    observeFirstRequest = resolveRequest;
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname !== japaneseIndexPath) {
      void request.continue();
      return;
    }
    japaneseIndexRequests += 1;
    observeFirstRequest();
    if (japaneseIndexRequests === 1) {
      void firstRequestGate.then(() => request.continue());
      return;
    }
    void request.continue();
  });

  await gotoQuery(
    page,
    "python list",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
  );
  await waitForResults(page);
  assert.equal(japaneseIndexRequests, 0);

  await page.$eval('[data-docs-radio][value="ja"]', (radio) => {
    radio.parentElement.dispatchEvent(new PointerEvent("pointerenter"));
  });
  await firstRequestObserved;
  assert.equal(
    await page.$eval("[data-search-status]", (status) => status.dataset.state),
    "success"
  );
  assert.equal(
    await page.$eval("[data-search-results]", (results) => results.dataset.docsLocale),
    "en"
  );

  await page.$eval('[data-docs-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "ja" &&
      document.querySelector("[data-search-status]")?.dataset.state === "loading"
  );
  releaseFirstRequest();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "ja" &&
      document.querySelector("[data-search-status]")?.dataset.state === "success",
    { timeout: 20_000 }
  );
  assert.equal(japaneseIndexRequests, 1);
  assert.ok((await snapshot(page)).locales.every((locale) => locale === "ja"));
  await page.close();
});

test("[performance] Docs locale intent respects reduced-data connections", async () => {
  const japaneseIndexPath = searchManifest.entries.find(
    (entry) =>
      entry.sourceId === "python-docs" &&
      entry.docsLocale === "ja" &&
      entry.status === "supported"
  )?.path;
  assert.ok(japaneseIndexPath);

  const page = await newPage();
  let japaneseIndexRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === japaneseIndexPath) {
      japaneseIndexRequests += 1;
    }
  });
  await gotoQuery(
    page,
    "python list",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
  );
  await waitForResults(page);
  assert.equal(japaneseIndexRequests, 0);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "4g" }
    });
    document.querySelector('[data-docs-radio][value="ja"]').focus();
  });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  assert.equal(japaneseIndexRequests, 0);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "2g" }
    });
    document.querySelector("[data-query-input]").focus();
    document.querySelector('[data-docs-radio][value="ja"]').focus();
  });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  assert.equal(japaneseIndexRequests, 0);
  assert.equal(
    await page.$eval("[data-search-status]", (status) => status.dataset.state),
    "success"
  );
  await page.close();
});

test("[performance] a failed Docs intent stays silent and a click retries normally", async () => {
  const japaneseIndexPath = searchManifest.entries.find(
    (entry) =>
      entry.sourceId === "python-docs" &&
      entry.docsLocale === "ja" &&
      entry.status === "supported"
  )?.path;
  assert.ok(japaneseIndexPath);

  const page = await newPage();
  await page.setRequestInterception(true);
  let japaneseIndexRequests = 0;
  let firstFailureObserved;
  const firstFailure = new Promise((resolveFailure) => {
    firstFailureObserved = resolveFailure;
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname !== japaneseIndexPath) {
      void request.continue();
      return;
    }
    japaneseIndexRequests += 1;
    if (japaneseIndexRequests === 1) {
      void request.respond({
        status: 503,
        contentType: "application/json",
        body: "{}"
      }).then(firstFailureObserved);
      return;
    }
    void request.continue();
  });

  await gotoQuery(
    page,
    "python list",
    "&docsLocale=en&sourceSelection=explicit&sourceId=python-docs"
  );
  await waitForResults(page);
  await page.$eval('[data-docs-radio][value="ja"]', (radio) => {
    radio.parentElement.dispatchEvent(new PointerEvent("pointerenter"));
  });
  await firstFailure;
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  assert.equal(
    await page.$eval("[data-search-status]", (status) => status.dataset.state),
    "success"
  );
  assert.equal(
    await page.$eval("[data-search-results]", (results) => results.dataset.docsLocale),
    "en"
  );

  await page.$eval('[data-docs-radio][value="ja"]', (radio) => radio.click());
  await page.waitForFunction(
    () =>
      document.querySelector("[data-search-results]")?.dataset.docsLocale === "ja" &&
      document.querySelector("[data-search-status]")?.dataset.state === "success",
    { timeout: 20_000 }
  );
  assert.equal(japaneseIndexRequests, 2);
  assert.ok((await snapshot(page)).locales.every((locale) => locale === "ja"));
  await page.close();
});

test("[performance] GET search and source policy changes preserve the document and cached indexes", async () => {
  const page = await newPage();
  const indexRequests = [];
  let documentRequests = 0;
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/search-index/")) indexRequests.push(pathname);
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documentRequests += 1;
    }
  });
  await gotoQuery(
    page,
    "javascript proxy",
    "&docsLocale=en&sourcePolicy=official"
  );
  await waitForResults(page);

  const initialIdentity = await page.evaluate(() => {
    globalThis.__odsPerformanceDocument = "preserved";
    return {
      timeOrigin: performance.timeOrigin,
      historyLength: history.length,
      fontFamily: getComputedStyle(document.body).fontFamily
    };
  });
  await page.$eval("details.source-details", (details) => {
    details.open = true;
  });
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  documentRequests = 0;
  indexRequests.length = 0;

  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="all"]'
  );
  await waitForResults(page);
  const firstAllSnapshot = await snapshot(page);
  const firstAllUrl = page.url();
  const firstAllIndexRequestCount = indexRequests.length;
  const preservedPolicyState = await page.evaluate(() => ({
    marker: globalThis.__odsPerformanceDocument,
    timeOrigin: performance.timeOrigin,
    sourceDetailsOpen: document.querySelector("details.source-details")?.open,
    focusedQuery: document.activeElement?.matches("[data-query-input]"),
    scrollY: window.scrollY,
    historyLength: history.length,
    fontFamily: getComputedStyle(document.body).fontFamily
  }));
  assert.deepEqual(preservedPolicyState, {
    marker: "preserved",
    timeOrigin: initialIdentity.timeOrigin,
    sourceDetailsOpen: true,
    focusedQuery: true,
    scrollY: 0,
    historyLength: initialIdentity.historyLength + 1,
    fontFamily: initialIdentity.fontFamily
  });
  assert.equal(documentRequests, 0);
  assert.ok(firstAllIndexRequestCount > 0);

  const comparisonPage = await newPage();
  await comparisonPage.goto(firstAllUrl, { waitUntil: "domcontentloaded" });
  await waitForResults(comparisonPage);
  assert.deepEqual(firstAllSnapshot, await snapshot(comparisonPage));
  await comparisonPage.close();

  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="fallback"]'
  );
  await waitForResults(page);
  await clickAndWaitForClientNavigation(
    page,
    '[data-source-policy-radio][value="all"]'
  );
  await waitForResults(page);
  assert.equal(indexRequests.length, firstAllIndexRequestCount);

  await page.$eval("[data-query-input]", (input) => {
    input.value = "javascript reflect";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickAndWaitForClientNavigation(page, '.search-group button[type="submit"]');
  await waitForResults(page);
  const clientSearchSnapshot = await snapshot(page);
  const clientSearchUrl = page.url();
  assert.equal(new URL(clientSearchUrl).searchParams.get("q"), "javascript reflect");
  assert.deepEqual(
    await page.evaluate(() => ({
      marker: globalThis.__odsPerformanceDocument,
      timeOrigin: performance.timeOrigin,
      focusedQuery: document.activeElement?.matches("[data-query-input]"),
      historyLength: history.length
    })),
    {
      marker: "preserved",
      timeOrigin: initialIdentity.timeOrigin,
      focusedQuery: true,
      historyLength: initialIdentity.historyLength + 4
    }
  );
  assert.equal(documentRequests, 0);

  const freshSearchPage = await newPage();
  await freshSearchPage.goto(clientSearchUrl, { waitUntil: "domcontentloaded" });
  await waitForResults(freshSearchPage);
  assert.deepEqual(clientSearchSnapshot, await snapshot(freshSearchPage));
  await freshSearchPage.close();

  const pageLoadCount = await armClientPageLoadCounter(page);
  await page.evaluate(() => history.back());
  await waitForClientPageLoad(page, pageLoadCount);
  await waitForResults(page);
  assert.equal(new URL(page.url()).searchParams.get("q"), "javascript proxy");
  assert.equal(
    await page.evaluate(() => performance.timeOrigin),
    initialIdentity.timeOrigin
  );
  await page.close();
});
