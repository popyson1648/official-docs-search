import type { QueryFlag } from "./query";

export interface HighlightSpan {
  text: string;
  className: string;
}

// Splits the raw query into spans so the overlay can colour the parts that
// parseQuery recognized as flags. Reusing the parser's flag analysis keeps the
// highlight in sync with how the query is actually interpreted, instead of a
// separate set of regexes.
export function buildHighlightSpans(value: string, flags: QueryFlag[]): HighlightSpan[] {
  const ordered = [...flags].sort((a, b) => a.start - b.start);
  const spans: HighlightSpan[] = [];
  let position = 0;

  for (const flag of ordered) {
    if (flag.start < position) continue;
    if (flag.start > position) {
      spans.push({ text: value.slice(position, flag.start), className: "" });
    }
    spans.push({
      text: value.slice(flag.start, flag.end),
      className: flag.valid ? "flag-token" : "flag-token invalid"
    });
    position = flag.end;
  }

  if (position < value.length) {
    spans.push({ text: value.slice(position), className: "" });
  }

  return spans;
}
