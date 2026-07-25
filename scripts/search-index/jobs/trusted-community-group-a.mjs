import {
  normalizeAnchoredMarkdownHeadings,
  normalizeGitBookSummary,
  normalizeGoByExampleToc,
  normalizeHtmlHeadings,
  normalizeJavascriptInfoToc,
  normalizeMarkdownSummary
} from "../trusted-community-group-a-parsers.mjs";

const common = {
  docsLocale: "en",
  maximumRecordDropRatio: 0.2,
  maximumSizeChangeRatio: 0.5
};

export const trustedCommunityGroupAJobs = [
  {
    ...common,
    sourceId: "comprehensive-rust",
    programmingLanguage: "rust",
    adapter: "markdown-summary",
    upstreamVersion: "Comprehensive Rust rolling course",
    urlPrefix: "https://google.github.io/comprehensive-rust/",
    minimumRecords: 500,
    knownQueries: ["Borrowing", "Ownership"],
    attribution:
      "Comprehensive Rust course content © Google LLC and contributors; CC BY 4.0.",
    licenseUrl:
      "https://github.com/google/comprehensive-rust/blob/main/LICENSE-CC-BY",
    qualification:
      "Google-maintained course; however, use the official Rust Reference and standard-library documentation for authoritative language and API details.",
    qualificationJa:
      "Google が保守する講座です。ただし、言語仕様や API の正確な確認には公式の Rust Reference と標準ライブラリ文書を参照してください。",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeMarkdownSummary(
        await fetchText(
          "https://raw.githubusercontent.com/google/comprehensive-rust/main/src/SUMMARY.md"
        ),
        metadata({
          sourceId: "comprehensive-rust",
          programmingLanguage: "rust",
          sourceName: "Comprehensive Rust",
          sourceKind: "conventional",
          buildUrl: comprehensiveRustUrl
        })
      )
  },
  {
    ...common,
    sourceId: "javascript-info",
    programmingLanguage: "javascript",
    adapter: "html-course-toc",
    upstreamVersion: "The Modern JavaScript Tutorial rolling",
    urlPrefix: "https://javascript.info/",
    minimumRecords: 180,
    knownQueries: ["Async/await", "Event loop"],
    attribution:
      "The Modern JavaScript Tutorial © Ilya Kantor and contributors. Repository terms are based on CC BY-NC 4.0; the site terms describe CC BY-NC-SA. Titles and direct links only.",
    licenseUrl:
      "https://github.com/javascript-tutorial/en.javascript.info/blob/master/LICENSE.md",
    qualification:
      "Systematic community tutorial; however, repository and site license labels differ, so only titles and direct links are indexed. Use ECMA-262 and MDN for authoritative current behavior.",
    qualificationJa:
      "体系的なコミュニティ教材です。ただし、リポジトリとサイトでライセンス表記が異なるため、見出しと直接リンクだけを収録しています。現在の仕様確認には ECMA-262 と MDN を参照してください。",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeJavascriptInfoToc(await fetchText("https://javascript.info/"), {
        ...metadata({
          sourceId: "javascript-info",
          programmingLanguage: "javascript",
          sourceName: "The Modern JavaScript Tutorial",
          sourceKind: "conventional"
        }),
        baseUrl: "https://javascript.info/"
      })
  },
  {
    ...common,
    sourceId: "typescript-deep-dive",
    programmingLanguage: "typescript",
    adapter: "gitbook-summary-sitemap",
    upstreamVersion: "TypeScript Deep Dive GitBook rolling",
    urlPrefix: "https://basarat.gitbook.io/typescript",
    minimumRecords: 110,
    knownQueries: ["strictNullChecks", "Compiler Internals"],
    attribution: "TypeScript Deep Dive © Basarat Ali Syed; CC BY 4.0.",
    licenseUrl:
      "https://github.com/basarat/typescript-book/blob/master/LICENSE.md",
    qualification:
      "Classic guide; however, many chapters were last updated in 2019–2020 and may predate recent TypeScript features. Verify current behavior in the official TypeScript documentation.",
    qualificationJa:
      "定評のある解説書です。ただし、多くの章は 2019〜2020 年の更新で、最近の TypeScript 機能を反映していない場合があります。現在の挙動は公式文書で確認してください。",
    updateFrequency: "monthly",
    load: async ({ fetchText }) =>
      normalizeGitBookSummary(
        await fetchText(
          "https://raw.githubusercontent.com/basarat/typescript-book/master/SUMMARY.md"
        ),
        await fetchText(
          "https://basarat.gitbook.io/typescript/sitemap-pages.xml"
        ),
        {
          ...metadata({
            sourceId: "typescript-deep-dive",
            programmingLanguage: "typescript",
            sourceName: "TypeScript Deep Dive",
            sourceKind: "conventional"
          }),
          baseUrl: "https://basarat.gitbook.io/typescript"
        }
      )
  },
  {
    ...common,
    sourceId: "go-by-example",
    programmingLanguage: "go",
    adapter: "html-example-toc",
    upstreamVersion: "Go by Example rolling",
    urlPrefix: "https://gobyexample.com/",
    minimumRecords: 75,
    knownQueries: ["Goroutines", "JSON"],
    attribution:
      "Go by Example © Mark McGranaghan; CC BY 3.0 Unported.",
    licenseUrl: "https://github.com/mmcgrana/gobyexample#license",
    qualification:
      "Example-oriented community tutorial; however, it is not the Go specification or a complete standard-library reference.",
    qualificationJa:
      "例を中心にしたコミュニティ教材です。ただし、Go 言語仕様や標準ライブラリを網羅する資料ではありません。",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeGoByExampleToc(await fetchText("https://gobyexample.com/"), {
        ...metadata({
          sourceId: "go-by-example",
          programmingLanguage: "go",
          sourceName: "Go by Example",
          sourceKind: "conventional"
        }),
        baseUrl: "https://gobyexample.com/"
      })
  },
  {
    ...common,
    sourceId: "cpp-core-guidelines",
    programmingLanguage: "cpp",
    adapter: "anchored-markdown-headings",
    upstreamVersion: "C++ Core Guidelines rolling",
    urlPrefix:
      "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
    minimumRecords: 525,
    knownQueries: ["RAII", "Prefer immutable data"],
    attribution:
      "C++ Core Guidelines © Standard C++ Foundation and contributors. Rule headings and direct links only under the project's custom license.",
    licenseUrl:
      "https://github.com/isocpp/CppCoreGuidelines/blob/master/LICENSE",
    qualification:
      "Community guidelines rather than the ISO C++ standard; however, only rule headings and direct links are indexed under the source's custom personal/internal-use license.",
    qualificationJa:
      "ISO C++ 規格ではなくコミュニティガイドラインです。ただし、独自ライセンスのため、ルール見出しと直接リンクだけを収録しています。",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeAnchoredMarkdownHeadings(
        await fetchText(
          "https://raw.githubusercontent.com/isocpp/CppCoreGuidelines/master/CppCoreGuidelines.md"
        ),
        {
          ...metadata({
            sourceId: "cpp-core-guidelines",
            programmingLanguage: "cpp",
            sourceName: "C++ Core Guidelines",
            sourceKind: "conventional"
          }),
          baseUrl:
            "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines"
        }
      )
  },
  {
    ...common,
    sourceId: "php-the-right-way",
    programmingLanguage: "php",
    adapter: "html-heading-index",
    upstreamVersion: "PHP: The Right Way rolling",
    urlPrefix: "https://phptherightway.com/",
    minimumRecords: 150,
    knownQueries: ["Dependency Injection", "Composer and Packagist"],
    attribution:
      "PHP: The Right Way © Josh Lockhart and contributors; CC BY-NC-SA 3.0.",
    licenseUrl:
      "https://github.com/codeguy/php-the-right-way/blob/gh-pages/LICENSE",
    qualification:
      "Community-maintained practical recommendations and curated links; however, check the official PHP manual for authoritative and current language behavior.",
    qualificationJa:
      "コミュニティが保守する実践的な推奨事項とリンク集です。ただし、言語の正確な現在の挙動は公式 PHP マニュアルで確認してください。",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeHtmlHeadings(await fetchText("https://phptherightway.com/"), {
        ...metadata({
          sourceId: "php-the-right-way",
          programmingLanguage: "php",
          sourceName: "PHP: The Right Way",
          sourceKind: "community"
        }),
        baseUrl: "https://phptherightway.com/"
      })
  }
];

function metadata(options) {
  return options;
}

function comprehensiveRustUrl(path) {
  const match = path.match(/^([^#?]+\.md)(#[^?]*)?$/);
  if (!match || match[1].startsWith("/") || match[1].split("/").includes("..")) {
    throw new Error(`Comprehensive Rust path is outside the reviewed scope: ${path}`);
  }
  const page =
    match[1] === "index.md"
      ? ""
      : match[1].replace(/\.md$/, ".html");
  return new URL(`${page}${match[2] ?? ""}`, "https://google.github.io/comprehensive-rust/")
    .href;
}
