import type { MiddlewareHandler } from "astro";

/* Every HTML document is rendered from the visitor's language, theme, and
   source cookies, so it must never be reused for another visitor. `Vary`
   already says so, but stating the policy removes the ambiguity for a shared
   cache that handles `Vary` poorly. `no-cache` still allows the browser's
   back-forward cache, which `no-store` would forfeit. */
export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next();
  const contentType = response.headers.get("content-type") ?? "";
  if (
    contentType.startsWith("text/html") &&
    !response.headers.has("cache-control")
  ) {
    response.headers.set("cache-control", "private, no-cache");
  }
  return response;
};
