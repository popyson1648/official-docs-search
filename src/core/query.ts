export type SourceMode = "official" | "all";

export interface ParsedQuery {
  raw: string;
  searchText: string;
  languages: string[];
  locale?: string;
  sourceMode?: SourceMode;
  flags: QueryFlag[];
  errors: QueryError[];
}

export interface QueryFlag {
  kind: "language" | "locale" | "source";
  token: string;
  start: number;
  end: number;
  valid: boolean;
}

export interface QueryError {
  code: "flag_in_search_text" | "empty_search_text" | "invalid_source_mode";
  token?: string;
  message: string;
}

interface Token {
  value: string;
  start: number;
  end: number;
}

export interface QueryParseOptions {
  knownLanguages: Set<string>;
}

const SOURCE_VALUES = new Set(["official", "all"]);

export function parseQuery(raw: string, options: QueryParseOptions): ParsedQuery {
  const tokens = tokenize(raw);
  const flags: QueryFlag[] = [];
  const errors: QueryError[] = [];

  if (tokens.length === 0) {
    return {
      raw,
      searchText: "",
      languages: [],
      flags,
      errors: []
    };
  }

  let start = 0;
  let end = tokens.length;
  const languages: string[] = [];
  let locale: string | undefined;
  let sourceMode: SourceMode | undefined;

  const first = tokens[0];
  const bareLanguages = parseBareLanguageToken(first.value, options.knownLanguages);
  if (bareLanguages.length > 0) {
    languages.push(...bareLanguages);
    flags.push({
      kind: "language",
      token: first.value,
      start: first.start,
      end: first.end,
      valid: true
    });
    start = 1;
  }

  while (start < end) {
    const parsed = parseFlagToken(tokens[start]);
    if (!parsed) break;
    flags.push({ ...parsed.flag, valid: parsed.error === undefined });
    if (parsed.error) errors.push(parsed.error);
    if (parsed.flag.kind === "language") languages.splice(0, languages.length, ...parsed.values);
    if (parsed.flag.kind === "locale") locale = parsed.values[0];
    if (parsed.flag.kind === "source" && isSourceMode(parsed.values[0])) sourceMode = parsed.values[0];
    start += 1;
  }

  while (end > start) {
    const parsed = parseFlagToken(tokens[end - 1]);
    if (!parsed) break;
    flags.push({ ...parsed.flag, valid: parsed.error === undefined });
    if (parsed.error) errors.push(parsed.error);
    if (parsed.flag.kind === "language") languages.splice(0, languages.length, ...parsed.values);
    if (parsed.flag.kind === "locale") locale = parsed.values[0];
    if (parsed.flag.kind === "source" && isSourceMode(parsed.values[0])) sourceMode = parsed.values[0];
    end -= 1;
  }

  const middle = tokens.slice(start, end);
  for (const token of middle) {
    if (parseFlagToken(token)) {
      flags.push({
        kind: token.value.startsWith("lang:")
          ? "language"
          : token.value.startsWith("locale:")
            ? "locale"
            : "source",
        token: token.value,
        start: token.start,
        end: token.end,
        valid: false
      });
      errors.push({
        code: "flag_in_search_text",
        token: token.value,
        message: "Flags must be placed before or after the search words."
      });
    }
  }

  const searchText = middle.map((token) => token.value).join(" ").trim();
  if (!searchText) {
    errors.push({
      code: "empty_search_text",
      message: "Enter search words after the language or flags."
    });
  }

  return {
    raw,
    searchText,
    languages: unique(languages),
    locale,
    sourceMode,
    flags: flags.sort((a, b) => a.start - b.start),
    errors
  };
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const matcher = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(input)) !== null) {
    tokens.push({
      value: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return tokens;
}

function parseBareLanguageToken(value: string, knownLanguages: Set<string>): string[] {
  if (!value || value.includes(":")) return [];
  const parts = value.split(",").map(normalizeLanguageId);
  if (parts.some((part) => !part || !knownLanguages.has(part))) return [];
  return parts;
}

function parseFlagToken(token: Token):
  | {
      flag: Omit<QueryFlag, "valid">;
      values: string[];
      error?: QueryError;
    }
  | undefined {
  const lower = token.value.toLowerCase();

  if (lower.startsWith("lang:")) {
    const values = token.value.slice("lang:".length).split(",").map(normalizeLanguageId).filter(Boolean);
    return {
      flag: {
        kind: "language",
        token: token.value,
        start: token.start,
        end: token.end
      },
      values
    };
  }

  if (lower.startsWith("locale:")) {
    const locale = token.value.slice("locale:".length).trim().toLowerCase();
    return {
      flag: {
        kind: "locale",
        token: token.value,
        start: token.start,
        end: token.end
      },
      values: locale ? [locale] : []
    };
  }

  if (lower.startsWith("source:")) {
    const value = token.value.slice("source:".length).trim().toLowerCase();
    return {
      flag: {
        kind: "source",
        token: token.value,
        start: token.start,
        end: token.end
      },
      values: value ? [value] : [],
      error: SOURCE_VALUES.has(value)
        ? undefined
        : {
            code: "invalid_source_mode",
            token: token.value,
            message: "Use source:official or source:all."
          }
    };
  }

  return undefined;
}

export function normalizeLanguageId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "c++" || normalized === "cplusplus") return "cpp";
  if (normalized === "c#" || normalized === "cs") return "csharp";
  if (normalized === "js" || normalized === "ecmascript") return "javascript";
  if (normalized === "ts") return "typescript";
  if (normalized === "py") return "python";
  if (normalized === "rs") return "rust";
  if (normalized === "rb") return "ruby";
  if (normalized === "golang") return "go";
  return normalized;
}

function isSourceMode(value: string): value is SourceMode {
  return SOURCE_VALUES.has(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
