import type { MiddlewareHandler } from "astro";
import { preparePrivateHtmlResponse } from "./core/html-response";

/* Every HTML document is rendered from the visitor's language, theme, and
   source cookies, so it must never be reused for another visitor. `Vary`
   already says so, but stating the policy removes the ambiguity for a shared
   cache that handles `Vary` poorly. `no-cache` still allows the browser's
   back-forward cache, which `no-store` would forfeit. `no-transform` keeps
   intermediaries, including the Cloudflare edge, from rewriting the document;
   without it the edge injects its Web Analytics beacon, contradicting the
   Privacy Policy's statement that the page embeds no third-party script. The
   application still negotiates Content-Encoding so the Workers runtime can
   compress the private stream without an intermediary transformation. */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();
  return preparePrivateHtmlResponse(response, {
    acceptEncoding: context.request.headers.get("accept-encoding"),
    method: context.request.method
  });
};
