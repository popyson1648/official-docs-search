export interface ResultFilterSource {
  id: string;
  name: string;
  programmingLanguage: string;
  programmingLanguageName?: string;
}

export interface ResultSourceFilterSelection {
  languageIds: ReadonlySet<string>;
  sourceIds: ReadonlySet<string>;
}

export interface ResolvedResultSourceFilters<T extends ResultFilterSource> {
  sources: T[];
  languageIds: Set<string>;
  sourceIds: Set<string>;
}

/**
 * Resolves result filter state against the sources in the original request.
 *
 * Selections are ORed within each facet and ANDed across the language and
 * source facets. Unknown values are discarded so stale UI state cannot remove
 * every result. An empty resolved facet means that all values in that facet
 * remain eligible.
 */
export function resolveResultSourceFilters<T extends ResultFilterSource>(
  sources: readonly T[],
  selection: ResultSourceFilterSelection
): ResolvedResultSourceFilters<T> {
  const availableLanguageIds = new Set(
    sources.map((source) => source.programmingLanguage)
  );
  const availableSourceIds = new Set(sources.map((source) => source.id));
  const languageIds = intersect(selection.languageIds, availableLanguageIds);
  const sourceIds = intersect(selection.sourceIds, availableSourceIds);

  return {
    sources: sources.filter(
      (source) =>
        (languageIds.size === 0 ||
          languageIds.has(source.programmingLanguage)) &&
        (sourceIds.size === 0 || sourceIds.has(source.id))
    ),
    languageIds,
    sourceIds
  };
}

function intersect(
  selectedIds: ReadonlySet<string>,
  availableIds: ReadonlySet<string>
): Set<string> {
  return new Set(
    [...selectedIds].filter((selectedId) => availableIds.has(selectedId))
  );
}
