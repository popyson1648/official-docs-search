import type { APIRoute } from "astro";

const fallbackOrigin = new URL("https://langrefsearch.com");

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? fallbackOrigin;
  const rootUrl = new URL("/", origin);
  const englishUrl = new URL("/", origin);
  englishUrl.searchParams.set("ui", "en");
  const japaneseUrl = new URL("/", origin);
  japaneseUrl.searchParams.set("ui", "ja");
  const urls = [rootUrl, englishUrl, japaneseUrl]
    .map((url) => `  <url><loc>${escapeXml(url.toString())}</loc></url>`)
    .join("\n");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
