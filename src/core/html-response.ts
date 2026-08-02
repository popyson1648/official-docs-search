const HTML_CONTENT_TYPE = "text/html";

export interface HtmlResponseOptions {
  acceptEncoding: string | null;
  method: string;
}

export function preparePrivateHtmlResponse(
  response: Response,
  options: HtmlResponseOptions
): Response {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith(HTML_CONTENT_TYPE)) return response;

  const headers = new Headers(response.headers);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "private, no-cache, no-transform");
  }
  mergeVary(headers, "Accept-Encoding");

  if (
    options.method.toUpperCase() === "HEAD" ||
    response.body === null ||
    response.status === 204 ||
    response.status === 205 ||
    response.status === 304 ||
    headers.has("content-encoding") ||
    !acceptsEncoding(options.acceptEncoding, "gzip")
  ) {
    return cloneResponse(response, headers);
  }

  headers.set("content-encoding", "gzip");
  headers.delete("content-length");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function acceptsEncoding(
  header: string | null,
  requestedEncoding: string
): boolean {
  if (!header) return false;
  let wildcardQuality: number | undefined;
  for (const value of header.split(",")) {
    const [rawEncoding, ...rawParameters] = value.trim().split(";");
    const encoding = rawEncoding?.trim().toLowerCase();
    if (!encoding) continue;
    let quality = 1;
    for (const parameter of rawParameters) {
      const [name, rawValue] = parameter.trim().split("=", 2);
      if (name?.toLowerCase() !== "q") continue;
      const parsed = Number(rawValue);
      quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
    }
    if (encoding === requestedEncoding.toLowerCase()) return quality > 0;
    if (encoding === "*") wildcardQuality = quality;
  }
  return (wildcardQuality ?? 0) > 0;
}

export function mergeVary(headers: Headers, fieldName: string): void {
  const current = headers.get("vary");
  if (current?.trim() === "*") return;
  const fields = (current ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (!fields.some((field) => field.toLowerCase() === fieldName.toLowerCase())) {
    fields.push(fieldName);
  }
  headers.set("vary", fields.join(", "));
}

function cloneResponse(response: Response, headers: Headers): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
