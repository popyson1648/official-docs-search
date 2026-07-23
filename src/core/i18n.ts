export type UiLanguage = "en" | "ja";

type Messages = Record<string, string>;

const messages: Record<UiLanguage, Messages> = {
  en: {
    title: "Official Docs Search",
    search: "Search",
    queryLabel: "Search documentation",
    queryPlaceholder: "python pathlib glob",
    includeTrusted: "Include non-official sources",
    sources: "Sources",
    help: "Help",
    close: "Close",
    uiLanguage: "UI",
    docsLocale: "Docs",
    activeTags: "Query modifiers",
    resultsTitle: "Search results",
    examples: "<language> <search words> / <search words> lang:<language> / <search words> locale:<locale>",
    noResults: "No results found.",
    searchLoading: "Loading search results…",
    searchProviderError: "Search indexes could not be loaded. Please retry.",
    resultCount: "Showing {count} results",
    indexUnavailable: "Index not yet available for: {sources}.",
    indexPlanned: "{source}: index planned.",
    indexBlocked: "{source}: index unavailable.",
    indexDisabled: "{source}: index disabled.",
    noSources: "Select at least one search source.",
    localeUnavailable: "Some sources don't support the selected locale.",
    flagsRule: "Flags are only recognized before or after the search words.",
    sourceOfficial: "Official",
    sourceConventional: "Conventional",
    sourceCommunity: "Community"
  },
  ja: {
    title: "Official Docs Search",
    search: "検索",
    queryLabel: "ドキュメント検索",
    queryPlaceholder: "python pathlib glob",
    includeTrusted: "公式以外のソースも含める",
    sources: "対象",
    help: "使い方",
    close: "閉じる",
    uiLanguage: "UI",
    docsLocale: "Docs",
    activeTags: "検索条件",
    resultsTitle: "検索結果",
    examples: "<language> <search words> / <search words> lang:<language> / <search words> locale:<locale>",
    noResults: "検索結果がありません。",
    searchLoading: "検索結果を読み込んでいます…",
    searchProviderError: "検索索引を読み込めませんでした。もう一度お試しください。",
    resultCount: "{count} 件を表示",
    indexUnavailable: "索引がまだ利用できない対象: {sources}。",
    indexPlanned: "{source}: 索引を準備中です。",
    indexBlocked: "{source}: 索引を取得できません。",
    indexDisabled: "{source}: 索引は無効です。",
    noSources: "検索対象を1つ以上選択してください。",
    localeUnavailable: "一部のソースは指定言語に未対応です。",
    flagsRule: "フラグは検索語の前か後でのみ認識されます。",
    sourceOfficial: "公式",
    sourceConventional: "事実上の公式",
    sourceCommunity: "コミュニティ"
  }
};

export function getUiLanguage(value: string | undefined | null): UiLanguage {
  return value === "ja" ? "ja" : "en";
}

export function t(language: UiLanguage, key: string): string {
  return messages[language][key] ?? messages.en[key] ?? key;
}

export function getSourceKindLabel(language: UiLanguage, kind: string): string {
  const keys: Record<string, string> = {
    official: "sourceOfficial",
    conventional: "sourceConventional",
    community: "sourceCommunity"
  };
  return keys[kind] ? t(language, keys[kind]) : kind;
}
