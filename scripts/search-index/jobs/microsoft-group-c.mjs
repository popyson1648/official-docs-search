import { parseMicrosoftGroupCToc } from "../parsers/microsoft-group-c.mjs";

const dotnetAttribution = ".NET documentation © Microsoft and contributors; CC BY 4.0.";
const dotnetLicenseUrl = "https://github.com/dotnet/docs/blob/main/LICENSE";
const powershellAttribution =
  "PowerShell documentation © Microsoft and contributors; CC BY 4.0.";
const powershellLicenseUrl =
  "https://github.com/MicrosoftDocs/PowerShell-Docs/blob/main/LICENSE.md";

export const microsoftGroupCJobs = [
  microsoftLearnTocJob({
    sourceId: "csharp-docs",
    programmingLanguage: "csharp",
    docsLocale: "ja",
    siteLocale: "ja-jp",
    inputPath: "dotnet/csharp/toc.json",
    outputPath: "dotnet/csharp/",
    minimumRecords: 250,
    knownQueries: ["ジェネリック", "非同期プログラミング"],
    attribution: dotnetAttribution,
    licenseUrl: dotnetLicenseUrl
  }),
  ...localizedJobPair({
    sourceId: "powershell-docs",
    programmingLanguage: "powershell",
    inputPath: "powershell/scripting/toc.json",
    outputPath: "powershell/",
    minimumRecords: 600,
    knownQueries: {
      en: ["What is PowerShell?", "Install PowerShell 7"],
      ja: ["PowerShell とは", "Windows に PowerShell 7 をインストールする"]
    },
    attribution: powershellAttribution,
    licenseUrl: powershellLicenseUrl
  }),
  ...localizedJobPair({
    sourceId: "fsharp-docs",
    programmingLanguage: "fsharp",
    inputPath: "dotnet/fsharp/toc.json",
    outputPath: "dotnet/fsharp/",
    minimumRecords: 130,
    knownQueries: {
      en: ["What is F#", "Options"],
      ja: ["F# とは", "オプション"]
    },
    attribution: dotnetAttribution,
    licenseUrl: dotnetLicenseUrl
  }),
  ...localizedJobPair({
    sourceId: "vb-docs",
    programmingLanguage: "visualbasic",
    inputPath: "dotnet/visual-basic/toc.json",
    outputPath: "dotnet/visual-basic/",
    minimumRecords: 600,
    knownQueries: {
      en: ["What's New for Visual Basic", "Arrays"],
      ja: ["Visual Basic の新機能", "配列"]
    },
    attribution: dotnetAttribution,
    licenseUrl: dotnetLicenseUrl
  })
];

function localizedJobPair(options) {
  return [
    microsoftLearnTocJob({
      ...options,
      docsLocale: "en",
      siteLocale: "en-us",
      knownQueries: options.knownQueries.en
    }),
    microsoftLearnTocJob({
      ...options,
      docsLocale: "ja",
      siteLocale: "ja-jp",
      knownQueries: options.knownQueries.ja
    })
  ];
}

function microsoftLearnTocJob(options) {
  const inputUrl = `https://learn.microsoft.com/${options.siteLocale}/${options.inputPath}`;
  const urlPrefix = `https://learn.microsoft.com/${options.siteLocale}/${options.outputPath}`;
  return {
    sourceId: options.sourceId,
    programmingLanguage: options.programmingLanguage,
    docsLocale: options.docsLocale,
    adapter: "microsoft-learn-localized-toc",
    upstreamVersion: "Microsoft Learn localized TOC rolling",
    urlPrefix,
    minimumRecords: options.minimumRecords,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: options.knownQueries,
    attribution: options.attribution,
    licenseUrl: options.licenseUrl,
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      parseMicrosoftGroupCToc(await fetchText(inputUrl), {
        inputUrl,
        urlPrefix,
        siteLocale: options.siteLocale,
        docsLocale: options.docsLocale
      })
  };
}
