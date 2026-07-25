import { request as requestHttps } from "node:https";

const GCC_HOST = "gcc.gnu.org";
const SLOW_CONNECT_HOSTS = new Set([GCC_HOST, "www.gnu.org"]);
const GCC_CRAWL_DELAY_MS = 60_000;
let gccQueue = Promise.resolve();
let gccNextRequestAt = 0;

export function fetchDocumentationUrl(url, options = {}) {
  const hostname = new URL(url).hostname;
  if (!SLOW_CONNECT_HOSTS.has(hostname)) return fetch(url, options);
  if (hostname !== GCC_HOST) return fetchHttps(url, options);

  const pending = gccQueue.then(async () => {
    const delay = Math.max(0, gccNextRequestAt - Date.now());
    if (delay > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    }
    try {
      return await fetchHttps(url, options);
    } finally {
      gccNextRequestAt = Date.now() + GCC_CRAWL_DELAY_MS;
    }
  });
  gccQueue = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
}

async function fetchHttps(url, options, redirectsRemaining = 5) {
  return await new Promise((resolve, reject) => {
    const request = requestHttps(
      url,
      {
        method: options.method ?? "GET",
        headers: options.headers
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location && redirectsRemaining > 0) {
          response.resume();
          resolve(
            fetchHttps(new URL(location, url).href, options, redirectsRemaining - 1)
          );
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.once("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status,
              headers: response.headers
            })
          );
        });
        response.once("error", reject);
      }
    );
    const timeout = setTimeout(
      () => request.destroy(new Error(`Timed out fetching ${url}`)),
      45_000
    );
    request.once("close", () => clearTimeout(timeout));
    request.once("error", reject);
    if (options.signal) {
      if (options.signal.aborted) {
        request.destroy(options.signal.reason);
      } else {
        options.signal.addEventListener(
          "abort",
          () => request.destroy(options.signal.reason),
          { once: true }
        );
      }
    }
    request.end();
  });
}
