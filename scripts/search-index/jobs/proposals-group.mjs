import {
  normalizePepIndex,
  normalizeJepIndex,
  normalizeTc39ProposalMarkdown
} from "../proposal-parsers.mjs";

export const proposalsGroupJobs = [
  {
    sourceId: "python-peps",
    programmingLanguage: "python",
    docsLocale: "en",
    adapter: "pep-json",
    upstreamVersion: "PEP index rolling",
    urlPrefix: "https://peps.python.org/",
    minimumRecords: 600,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["PEP 8", "PEP 703", "typing"],
    attribution:
      "Python Enhancement Proposal metadata © Python contributors; individual PEPs are public domain or CC0-1.0.",
    licenseUrl: "https://peps.python.org/pep-0001/",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizePepIndex(
        JSON.parse(await fetchText("https://peps.python.org/api/peps.json")),
        {
          sourceId: "python-peps",
          sourceName: "Python Enhancement Proposals",
          programmingLanguage: "python"
        }
      )
  },
  {
    sourceId: "openjdk-jeps",
    programmingLanguage: "java",
    docsLocale: "en",
    adapter: "openjdk-jep-index",
    upstreamVersion: "OpenJDK JEP index rolling",
    urlPrefix: "https://openjdk.org/jeps/",
    minimumRecords: 450,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["JEP 444", "virtual threads", "structured concurrency"],
    attribution: "OpenJDK JEP metadata © Oracle and/or its affiliates; GPLv2.",
    licenseUrl: "https://openjdk.org/legal/gplv2+ce.html",
    updateFrequency: "weekly",
    load: async ({ fetchText }) =>
      normalizeJepIndex(await fetchText("https://openjdk.org/jeps/0"), {
        sourceId: "openjdk-jeps",
        sourceName: "JDK Enhancement Proposals",
        programmingLanguage: "java"
      })
  },
  {
    sourceId: "tc39-proposals",
    programmingLanguage: "javascript",
    docsLocale: "en",
    adapter: "tc39-proposal-markdown",
    upstreamVersion: "TC39 proposals rolling",
    urlPrefix: "https://github.com/tc39/",
    minimumRecords: 293,
    maximumRecordDropRatio: 0.2,
    maximumSizeChangeRatio: 0.5,
    knownQueries: ["decorators", "pipeline operator", "iterator helpers"],
    attribution:
      "Metadata-only index of the official tc39/proposals tracking tables; that repository declares no explicit reuse license.",
    licenseUrl: "https://github.com/tc39/proposals",
    updateFrequency: "weekly",
    load: async ({ fetchText }) => {
      const base =
        "https://raw.githubusercontent.com/tc39/proposals/main/";
      const inputs = [
        { path: "README.md" },
        { path: "stage-1-proposals.md", status: "stage-1" },
        { path: "stage-0-proposals.md", status: "stage-0" },
        { path: "finished-proposals.md", status: "finished" },
        { path: "inactive-proposals.md", status: "inactive" }
      ];
      const documents = await Promise.all(
        inputs.map(async (input) => ({
          ...input,
          markdown: await fetchText(`${base}${input.path}`)
        }))
      );
      return normalizeTc39ProposalMarkdown(documents, {
        sourceId: "tc39-proposals",
        sourceName: "TC39 Proposals",
        programmingLanguage: "javascript"
      });
    }
  }
];
