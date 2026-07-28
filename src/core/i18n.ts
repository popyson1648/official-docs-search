export type UiLanguage = "en" | "ja";

type Messages = Record<string, string>;

const messages: Record<UiLanguage, Messages> = {
  en: {
    title: "Official Docs Search",
    search: "Search",
    queryLabel: "Search documentation",
    queryInputLabel: "Search terms",
    sourcePolicyLabel: "Non-official sources",
    sourcePolicyOfficial: "Don't include",
    sourcePolicyFallback: "Only if unavailable",
    sourcePolicyAll: "Include",
    sources: "Sources",
    help: "Search syntax",
    close: "Close",
    uiLanguage: "Language",
    activeTags: "Query modifiers",
    removeLanguage: "Remove {language} from the query",
    resultsTitle: "Search results",
    examples: "Example: js promise all",
    multiTermAnd:
      "Multiple search words narrow results to pages containing all of them.",
    filterResults: "Filter results",
    backToTools: "Back to tools",
    filterLanguage: "Language",
    filterSite: "Site",
    filterOrder: "Order",
    sortRelevance: "Relevance",
    sortLanguageAscending: "Language A–Z",
    sortLanguageDescending: "Language Z–A",
    clearAllFilters: "Clear all",
    removeFilter: "Remove filter: {filter}",
    resultFilters: "Search result filters",
    noResults: "No results found.",
    searchLoading: "Loading search results…",
    searchProviderError: "Search indexes could not be loaded. Please retry.",
    resultCount: "{count} results",
    aboutSources: "About sources",
    pageTop: "Top",
    loadMore: "Show {count} more",
    loadMoreProgress: "Showing {visible} of {total} results",
    allResultsShown: "All {total} results shown",
    indexUnavailable: "Index not yet available for: {sources}.",
    indexPlanned: "{source}: index planned.",
    indexBlocked: "{source}: index unavailable.",
    indexDisabled: "{source}: index disabled.",
    localeFallbackSummary:
      "The following sources do not have Japanese documentation, so English search results are shown.",
    indexLoadFailed:
      "{source} ({locale}): the index could not be loaded; other available results are shown.",
    noSources: "Select at least one search source.",
    localeUnavailable: "Some sources don't support Japanese.",
    japaneseUnavailable: "No Japanese version",
    qualificationLabel: "Note:",
    flagsRule: "Flags are only recognized before or after the search words.",
    shortAliases: "Short names such as py and ts are also accepted.",
    symbolsHelp: "Symbols such as ::, ?., $, %, and <T> are searched as ordinary text.",
    sourceOfficial: "Official",
    sourceConventional: "Conventional",
    sourceCommunity: "Community",
    documentReference: "Reference",
    documentSpecification: "Specification",
    documentProposal: "Proposal / RFC",
    documentDesignRecord: "Design record",
    proposalStatus: "Status",
    proposalWarning: "This proposal may not describe current adopted behavior."
  },
  ja: {
    title: "ドキュメント検索",
    search: "検索",
    queryLabel: "ドキュメント検索",
    queryInputLabel: "検索語",
    sourcePolicyLabel: "非公式ソース",
    sourcePolicyOfficial: "含めない",
    sourcePolicyFallback: "公式がない時だけ",
    sourcePolicyAll: "含める",
    sources: "ソース",
    help: "検索方法",
    close: "閉じる",
    uiLanguage: "言語",
    activeTags: "検索条件",
    removeLanguage: "{language}を検索条件から削除",
    resultsTitle: "検索結果",
    examples: "例：js promise all",
    multiTermAnd: "検索語を複数入力すると、すべてを含む結果に絞り込みます。",
    filterResults: "絞り込み",
    backToTools: "ツールに戻る",
    filterLanguage: "言語",
    filterSite: "サイト",
    filterOrder: "並び順",
    sortRelevance: "関連度順",
    sortLanguageAscending: "言語名の昇順",
    sortLanguageDescending: "言語名の降順",
    clearAllFilters: "すべて解除",
    removeFilter: "絞り込みを解除：{filter}",
    resultFilters: "検索結果の絞り込み",
    noResults: "検索結果がありません。",
    searchLoading: "検索結果を読み込んでいます…",
    searchProviderError: "検索索引を読み込めませんでした。もう一度お試しください。",
    resultCount: "{count}件の検索結果",
    aboutSources: "ソースについて",
    pageTop: "ページ上部へ",
    loadMore: "さらに{count}件表示",
    loadMoreProgress: "{total}件中{visible}件を表示",
    allResultsShown: "全{total}件を表示しました",
    indexUnavailable: "索引がまだ利用できない対象: {sources}。",
    indexPlanned: "{source}: 索引を準備中です。",
    indexBlocked: "{source}: 索引を取得できません。",
    indexDisabled: "{source}: 索引は無効です。",
    localeFallbackSummary:
      "次のソースは日本語版がないため、英語の検索結果を表示しています。",
    indexLoadFailed:
      "{source}（{locale}）: 索引を読み込めなかったため、取得できた検索結果のみ表示します。",
    noSources: "検索対象を1つ以上選択してください。",
    localeUnavailable: "一部のソースは日本語に未対応です。",
    japaneseUnavailable: "日本語未対応",
    qualificationLabel: "補足：",
    flagsRule: "フラグは検索語の前か後でのみ認識されます。",
    shortAliases: "py や ts などの短縮名も使えます。",
    symbolsHelp: "::、?.、$、%、<T> などの記号は通常の検索文字として扱われます。",
    sourceOfficial: "公式",
    sourceConventional: "事実上の公式",
    sourceCommunity: "コミュニティ",
    documentReference: "リファレンス",
    documentSpecification: "仕様書",
    documentProposal: "提案・RFC",
    documentDesignRecord: "設計記録",
    proposalStatus: "状態",
    proposalWarning: "この提案は、現在採用されている仕様を示すとは限りません。"
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

export function getDocumentKindLabel(language: UiLanguage, kind: string): string {
  const keys: Record<string, string> = {
    reference: "documentReference",
    specification: "documentSpecification",
    proposal: "documentProposal",
    "design-record": "documentDesignRecord"
  };
  return keys[kind] ? t(language, keys[kind]) : kind;
}
