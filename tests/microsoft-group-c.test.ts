import { describe, expect, it } from "vitest";
import { microsoftGroupCJobs } from "../scripts/search-index/jobs/microsoft-group-c.mjs";
import { parseMicrosoftGroupCToc } from "../scripts/search-index/parsers/microsoft-group-c.mjs";

describe("Microsoft Learn group C adapters", () => {
  it("declares the requested source-locale jobs", () => {
    expect(
      microsoftGroupCJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)
    ).toEqual([
      "csharp-docs/ja",
      "powershell-docs/en",
      "powershell-docs/ja",
      "fsharp-docs/en",
      "fsharp-docs/ja",
      "vb-docs/en",
      "vb-docs/ja"
    ]);
  });

  it("uses localized titles and keeps links within the matching locale", () => {
    const records = parseMicrosoftGroupCToc(
      JSON.stringify({
        items: [
          {
            toc_title: "基礎",
            children: [
              { toc_title: "ジェネリック", href: "fundamentals/types/generics" },
              {
                toc_title: "外部サンプル",
                href: "https://github.com/dotnet/docs/tree/main/samples"
              }
            ]
          }
        ]
      }),
      {
        inputUrl: "https://learn.microsoft.com/ja-jp/dotnet/csharp/toc.json",
        urlPrefix: "https://learn.microsoft.com/ja-jp/dotnet/csharp/",
        siteLocale: "ja-jp",
        docsLocale: "ja"
      }
    );

    expect(records).toEqual([
      {
        title: "ジェネリック",
        url: "https://learn.microsoft.com/ja-jp/dotnet/csharp/fundamentals/types/generics",
        section: "基礎"
      }
    ]);
  });

  it("preserves the locale for root-relative Microsoft Learn links", () => {
    const records = parseMicrosoftGroupCToc(
      JSON.stringify({
        items: [
          {
            toc_title: "PlatyPS を使用したモジュール ヘルプの作成",
            href: "/powershell/utility-modules/platyps/create-help-using-platyps"
          }
        ]
      }),
      {
        inputUrl: "https://learn.microsoft.com/ja-jp/powershell/scripting/toc.json",
        urlPrefix: "https://learn.microsoft.com/ja-jp/powershell/",
        siteLocale: "ja-jp",
        docsLocale: "ja"
      }
    );

    expect(records[0].url).toBe(
      "https://learn.microsoft.com/ja-jp/powershell/utility-modules/platyps/create-help-using-platyps"
    );
  });

  it("rejects malformed or empty TOC payloads", () => {
    const options = {
      inputUrl: "https://learn.microsoft.com/en-us/dotnet/fsharp/toc.json",
      urlPrefix: "https://learn.microsoft.com/en-us/dotnet/fsharp/",
      siteLocale: "en-us"
    };
    expect(() => parseMicrosoftGroupCToc("not JSON", options)).toThrow(
      /Invalid Microsoft Learn TOC JSON/
    );
    expect(() => parseMicrosoftGroupCToc('{"items":[]}', options)).toThrow(
      /no localized links/
    );
    expect(() =>
      parseMicrosoftGroupCToc(
        '{"items":[{"toc_title":"English title only","href":"overview"}]}',
        { ...options, docsLocale: "ja" }
      )
    ).toThrow(/localized Japanese titles are missing/);
  });
});
