import { describe, expect, it } from "vitest";
import { qualifySearchRecordTitles } from "../scripts/search-index/title-qualification.mjs";

const record = (title: string, url: string, section?: string) => ({
  title,
  url,
  ...(section ? { section } : {})
});

describe("search-index result title qualification", () => {
  it("uses canonical C++ names for cpprefjp free functions and members", () => {
    const records = qualifySearchRecordTitles(
      [
        record("sort", "https://cpprefjp.github.io/reference/algorithm/sort.html", "cpprefjp"),
        record("sort", "https://cpprefjp.github.io/reference/list/list/sort.html", "cpprefjp"),
        record(
          "ranges sort",
          "https://cpprefjp.github.io/reference/algorithm/ranges_sort.html",
          "cpprefjp"
        ),
        record(
          "op equal",
          "https://cpprefjp.github.io/reference/vector/vector/op_equal.html",
          "cpprefjp"
        )
      ],
      { sourceId: "cpprefjp", docsLocale: "ja", adapter: "sitemap" }
    );

    expect(records.map((item: { title: string }) => item.title)).toEqual([
      "std::sort",
      "std::list::sort",
      "std::ranges::sort",
      "std::vector::operator=="
    ]);
  });

  it("qualifies Ruby class and instance methods from reviewed URL shapes", () => {
    expect(
      qualifySearchRecordTitles(
        [
          record("::new", "https://docs.ruby-lang.org/en/3.4/Array.html#method-c-new"),
          record("#inspect", "https://docs.ruby-lang.org/en/3.4/Array.html#method-i-inspect")
        ],
        { sourceId: "ruby-docs", docsLocale: "en", adapter: "rdoc-toc" }
      ).map((item: { title: string }) => item.title)
    ).toEqual(["Array::new", "Array#inspect"]);

    expect(
      qualifySearchRecordTitles(
        [
          record(
            "::new",
            "https://docs.ruby-lang.org/en/3.4/Gem/SafeMarshal/Elements/Array.html#method-c-new"
          )
        ],
        { sourceId: "ruby-docs", docsLocale: "en", adapter: "rdoc-toc" }
      )[0].title
    ).toBe("Gem::SafeMarshal::Elements::Array::new");

    expect(
      qualifySearchRecordTitles(
        [
          record(
            ".new",
            "https://docs.ruby-lang.org/ja/3.4/method/Benchmark=3a=3aJob/s/new.html"
          )
        ],
        { sourceId: "ruby-docs", docsLocale: "ja", adapter: "ruby-reference-index" }
      )[0].title
    ).toBe("Benchmark::Job.new");
  });

  it("uses structured owners for ExDoc and Javadoc API titles", () => {
    expect(
      qualifySearchRecordTitles(
        [record("t()", "https://hexdocs.pm/elixir/Date.html#t:t/0", "Date")],
        { sourceId: "elixir-docs", docsLocale: "en", adapter: "exdoc-sidebar" }
      )[0].title
    ).toBe("Date.t()");

    expect(
      qualifySearchRecordTitles(
        [
          record(
            "List",
            "https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html",
            "java.util"
          )
        ],
        { sourceId: "java-docs", docsLocale: "en", adapter: "javadoc-types" }
      )[0].title
    ).toBe("java.util.List");
  });

  it("adds trustworthy section context to ambiguous prose without inventing namespaces", () => {
    const records = qualifySearchRecordTitles(
      [
        record("Overview", "https://example.com/a", "Generics"),
        record("Overview", "https://example.com/b", "Pattern matching"),
        record("Unique", "https://example.com/c", "Guide")
      ],
      { sourceId: "example", docsLocale: "en", adapter: "yaml-toc" }
    );

    expect(records.map((item: { title: string }) => item.title)).toEqual([
      "Overview — Generics",
      "Overview — Pattern matching",
      "Unique"
    ]);
  });

  it("uses a concise URL parent when duplicate prose has no section context", () => {
    const records = qualifySearchRecordTitles(
      [
        record("Troubleshoot", "https://dart.dev/tools/dartpad/troubleshoot"),
        record("Troubleshoot", "https://dart.dev/tools/pub/troubleshoot")
      ],
      { sourceId: "dart-docs", docsLocale: "en", adapter: "sitemap" }
    );
    expect(records.map((item: { title: string }) => item.title)).toEqual([
      "Troubleshoot — dartpad",
      "Troubleshoot — pub"
    ]);
  });

  it("does not alter proposal archive titles", () => {
    const records = qualifySearchRecordTitles(
      [
        record("P2300R10: std::execution", "https://open-std.org/p2300r10.html", "Adopted"),
        record("P2300R10: std::execution", "https://open-std.org/p2300r10.pdf", "Adopted")
      ],
      { sourceId: "wg21-papers", docsLocale: "en", adapter: "wg21-paper-index" }
    );
    expect(records.map((item: { title: string }) => item.title)).toEqual([
      "P2300R10: std::execution",
      "P2300R10: std::execution"
    ]);
  });
});
