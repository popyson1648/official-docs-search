import { isAllowedResultUrl, type DocsSource } from "./sources";

export interface SearchRequest {
  query: string;
  locale?: string;
  sources: DocsSource[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceId: string;
}

export interface SearchResponse {
  results: SearchResult[];
  providerNotice?: string;
}

export interface SearchProvider {
  search(request: SearchRequest): Promise<SearchResponse>;
}

interface GoogleItem {
  title?: string;
  link?: string;
  snippet?: string;
}

export class GoogleCustomSearchProvider implements SearchProvider {
  constructor(
    private readonly apiKey: string,
    private readonly cx: string
  ) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const perSource = await Promise.all(
      request.sources.map(async (source) => {
        const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
        url.searchParams.set("key", this.apiKey);
        url.searchParams.set("cx", this.cx);
        url.searchParams.set("q", request.query);
        url.searchParams.set("num", "5");
        url.searchParams.set("siteSearch", source.domains[0] ?? new URL(source.url).hostname);
        url.searchParams.set("siteSearchFilter", "i");
        if (request.locale) {
          url.searchParams.set("hl", request.locale);
          url.searchParams.set("lr", `lang_${request.locale}`);
        }

        const response = await fetch(url);
        if (!response.ok) return [];
        const data = (await response.json()) as { items?: GoogleItem[] };
        return (data.items ?? [])
          .filter((item) => item.link && isAllowedResultUrl(item.link, [source]))
          .map((item) => ({
            title: item.title ?? item.link ?? source.name,
            url: item.link as string,
            snippet: item.snippet ?? "",
            sourceId: source.id
          }));
      })
    );

    return {
      results: dedupeResults(perSource.flat()).slice(0, 20)
    };
  }
}

export class CatalogPreviewSearchProvider implements SearchProvider {
  async search(request: SearchRequest): Promise<SearchResponse> {
    return {
      providerNotice:
        "Search provider credentials are not configured. Showing matching documentation sources instead.",
      results: request.sources.map((source) => ({
        title: source.name,
        url: source.url,
        snippet: `Trusted ${source.kind} source for ${request.query}.`,
        sourceId: source.id
      }))
    };
  }
}

export function createSearchProvider(env: Record<string, string | undefined>): SearchProvider {
  if (env.GOOGLE_CUSTOM_SEARCH_API_KEY && env.GOOGLE_CUSTOM_SEARCH_CX) {
    return new GoogleCustomSearchProvider(env.GOOGLE_CUSTOM_SEARCH_API_KEY, env.GOOGLE_CUSTOM_SEARCH_CX);
  }
  return new CatalogPreviewSearchProvider();
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
}
