import { describe, expect, it } from "vitest";
import {
  acceptsEncoding,
  mergeVary,
  preparePrivateHtmlResponse
} from "../src/core/html-response";

describe("acceptsEncoding", () => {
  it.each([
    ["gzip", true],
    ["br, gzip;q=0.5", true],
    ["GZIP; q=1", true],
    ["*;q=0.2", true],
    ["gzip;q=0, *;q=1", false],
    ["br", false],
    [null, false]
  ])("parses %s", (header, expected) => {
    expect(acceptsEncoding(header, "gzip")).toBe(expected);
  });
});

describe("mergeVary", () => {
  it("appends a field once while preserving existing variance", () => {
    const headers = new Headers({ Vary: "Accept-Language, Cookie" });
    mergeVary(headers, "Accept-Encoding");
    mergeVary(headers, "accept-encoding");
    expect(headers.get("vary")).toBe("Accept-Language, Cookie, Accept-Encoding");
  });

  it("preserves wildcard variance", () => {
    const headers = new Headers({ Vary: "*" });
    mergeVary(headers, "Accept-Encoding");
    expect(headers.get("vary")).toBe("*");
  });
});

describe("preparePrivateHtmlResponse", () => {
  it("asks the Workers runtime for one automatic gzip representation", async () => {
    const body = "<!doctype html><p>private response</p>".repeat(100);
    const prepared = preparePrivateHtmlResponse(
      new Response(body, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": String(Buffer.byteLength(body)),
          Vary: "Accept-Language, Cookie"
        }
      }),
      { acceptEncoding: "br, gzip", method: "GET" }
    );

    expect(prepared.headers.get("cache-control")).toBe(
      "private, no-cache, no-transform"
    );
    expect(prepared.headers.get("content-encoding")).toBe("gzip");
    expect(prepared.headers.has("content-length")).toBe(false);
    expect(prepared.headers.get("vary")).toBe(
      "Accept-Language, Cookie, Accept-Encoding"
    );
    /* The standard Response used by Vitest does not implement Workers'
       automatic content encoding. The production-server contract test checks
       the bytes emitted by workerd. */
    expect(await prepared.text()).toBe(body);
  });

  it("keeps identity clients readable and varies their response", async () => {
    const prepared = preparePrivateHtmlResponse(
      new Response("<p>identity</p>", {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      }),
      { acceptEncoding: "br", method: "GET" }
    );

    expect(prepared.headers.get("content-encoding")).toBeNull();
    expect(prepared.headers.get("vary")).toBe("Accept-Encoding");
    expect(await prepared.text()).toBe("<p>identity</p>");
  });

  it("does not recompress an encoded response", async () => {
    const prepared = preparePrivateHtmlResponse(
      new Response("already encoded", {
        headers: {
          "Content-Type": "text/html",
          "Content-Encoding": "br"
        }
      }),
      { acceptEncoding: "gzip", method: "GET" }
    );

    expect(prepared.headers.get("content-encoding")).toBe("br");
    expect(await prepared.text()).toBe("already encoded");
  });

  it("does not change non-HTML responses", () => {
    const response = new Response("{}", {
      headers: { "Content-Type": "application/json" }
    });
    expect(
      preparePrivateHtmlResponse(response, {
        acceptEncoding: "gzip",
        method: "GET"
      })
    ).toBe(response);
  });
});
