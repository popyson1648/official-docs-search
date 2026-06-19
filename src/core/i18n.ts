export type UiLanguage = "en" | "ja";

type Messages = Record<string, string>;

const messages: Record<UiLanguage, Messages> = {
  en: {
    title: "Official Docs Search",
    search: "Search",
    queryLabel: "Search official programming language documentation",
    includeTrusted: "Include trusted sources",
    trustedSources: "Trusted sources",
    help: "Help",
    settings: "Settings",
    uiLanguage: "UI language",
    docsLocale: "Docs locale",
    examples: "<language> <search words> / <search words> lang:<language> / <search words> locale:<locale>",
    empty: "Enter a search query.",
    noResults: "No results found.",
    localeUnavailable: "Requested documentation locale is not available for some selected sources.",
    flagsRule: "Flags are only recognized before or after the search words.",
    sourceOfficial: "Official",
    sourceConventional: "Conventional",
    sourceCommunity: "Community"
  },
  ja: {
    title: "Official Docs Search",
    search: "検索",
    queryLabel: "プログラミング言語の公式ドキュメントを検索",
    includeTrusted: "信頼済みソースも含める",
    trustedSources: "信頼済みソース",
    help: "使い方",
    settings: "設定",
    uiLanguage: "サイト表示言語",
    docsLocale: "ドキュメント言語",
    examples: "<language> <search words> / <search words> lang:<language> / <search words> locale:<locale>",
    empty: "検索語を入力してください。",
    noResults: "検索結果がありません。",
    localeUnavailable: "選択した一部ソースでは指定したドキュメント言語を利用できません。",
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
