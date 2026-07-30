import type { APIRoute } from "astro";

const fallbackOrigin = new URL("https://official-docs-search.popyson.com");

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL("/sitemap.xml", site ?? fallbackOrigin);
  const body = ["User-agent: *", "Allow: /", `Sitemap: ${sitemapUrl}`, ""].join(
    "\n"
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
