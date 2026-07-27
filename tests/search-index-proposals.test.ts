import { describe, expect, it } from "vitest";
import {
  normalizePepIndex,
  normalizeJepIndex,
  normalizeTc39ProposalMarkdown
} from "../scripts/search-index/proposal-parsers.mjs";
import { proposalsGroupJobs } from "../scripts/search-index/jobs/proposals-group.mjs";

describe("language proposal search-index jobs", () => {
  it("publishes Python and JavaScript proposal archives", () => {
    expect(proposalsGroupJobs.map((job) => `${job.sourceId}/${job.docsLocale}`)).toEqual([
      "python-peps/en",
      "openjdk-jeps/en",
      "tc39-proposals/en"
    ]);
  });

  it("preserves JEP identifiers, status, release, and component", () => {
    const records = normalizeJepIndex(
      `<table class="jeps"><tr>
        <td><span title="Type: Feature">F</span></td>
        <td><span title="Status: Closed / Delivered">Clo</span></td>
        <td><span title="Release: 21">21</span></td>
        <td>core</td><td>/</td><td>lang</td>
        <td class="jep">444</td><td><a href="444">Virtual Threads</a></td>
      </tr></table>`,
      {
        sourceId: "openjdk-jeps",
        sourceName: "JDK Enhancement Proposals",
        programmingLanguage: "java"
      }
    );
    expect(records[0]).toEqual(
      expect.objectContaining({
        title: "JEP 444: Virtual Threads",
        proposalStatus: "Closed / Delivered",
        section: "Feature · 21 · core/lang"
      })
    );
  });

  it("labels JBS-backed entries as drafts rather than assigned JEP numbers", () => {
    const records = normalizeJepIndex(
      `<table class="jeps"><tr>
        <td><span title="Type: Feature">F</span></td>
        <td><span title="Status: Draft">Dra</span></td>
        <td></td><td>core</td><td>/</td><td>lang</td>
        <td class="jep">8335368</td><td><a href="8335368">Candidate feature</a></td>
      </tr></table>`,
      {
        sourceId: "openjdk-jeps",
        sourceName: "JDK Enhancement Proposals",
        programmingLanguage: "java"
      }
    );
    expect(records[0]).toEqual(
      expect.objectContaining({
        title: "JEP draft: Candidate feature",
        section: expect.stringContaining("JBS 8335368"),
        proposalStatus: "Draft"
      })
    );
  });

  it("preserves PEP identifiers and raw status", () => {
    const records = normalizePepIndex(
      {
        "703": {
          number: 703,
          title: "Making the Global Interpreter Lock Optional",
          authors: "Sam Gross",
          status: "Accepted",
          type: "Standards Track",
          python_version: "3.13",
          url: "https://peps.python.org/pep-0703/"
        }
      },
      {
        sourceId: "python-peps",
        sourceName: "Python Enhancement Proposals",
        programmingLanguage: "python"
      }
    );
    expect(records[0]).toEqual(
      expect.objectContaining({
        title: "PEP 703: Making the Global Interpreter Lock Optional",
        proposalStatus: "Accepted",
        documentKind: "proposal"
      })
    );
  });

  it("preserves code punctuation in PEP titles", () => {
    const records = normalizePepIndex(
      {
        "624": {
          number: 624,
          title: "Remove Py_UNICODE encoder APIs and except* behavior",
          status: "Final",
          url: "https://peps.python.org/pep-0624/"
        }
      },
      {
        sourceId: "python-peps",
        sourceName: "Python Enhancement Proposals",
        programmingLanguage: "python"
      }
    );
    expect(records[0].title).toBe(
      "PEP 624: Remove Py_UNICODE encoder APIs and except* behavior"
    );
  });

  it("uses direct TC39 links and official tracker rows for designated external repositories", () => {
    const markdown = `
### Stage 3
| Proposal | Author |
| --- | --- |
| [Iterator Helpers][helpers] | A |
| [External proposal][external] | B |
| [Empty reference][] | C |
| Plain composite proposal | D |
[helpers]: https://github.com/tc39/proposal-iterator-helpers
[external]: https://example.test/proposal
[empty reference]: https://champion.example/proposal
`;
    const records = normalizeTc39ProposalMarkdown(
      [{ path: "README.md", markdown }],
      {
        sourceId: "tc39-proposals",
        sourceName: "TC39 Proposals",
        programmingLanguage: "javascript"
      }
    );
    expect(records).toEqual([
      expect.objectContaining({
        title: "Iterator Helpers",
        proposalStatus: "stage-3",
        url: "https://github.com/tc39/proposal-iterator-helpers"
      }),
      expect.objectContaining({
        title: "External proposal",
        url: "https://github.com/tc39/proposals/blob/main/README.md?plain=1#L6"
      }),
      expect.objectContaining({
        title: "Empty reference",
        url: "https://github.com/tc39/proposals/blob/main/README.md?plain=1#L7"
      }),
      expect.objectContaining({
        title: "Plain composite proposal",
        url: "https://github.com/tc39/proposals/blob/main/README.md?plain=1#L8"
      })
    ]);
  });

  it("preserves the inactive rationale without meeting-note markup", () => {
    const records = normalizeTc39ProposalMarkdown(
      [{
        path: "inactive-proposals.md",
        status: "inactive",
        markdown: `
| Proposal | Champion | Rationale | Meeting Notes |
| --- | --- | --- | --- |
| [Old proposal][old] | A | Withdrawn; replaced by [New proposal][new] | <sub>&nbsp;-[2016][notes]</sub> |
[old]: https://example.test/old
[new]: https://github.com/tc39/proposal-new
[notes]: https://example.test/notes
`
      }],
      {
        sourceId: "tc39-proposals",
        sourceName: "TC39 Proposals",
        programmingLanguage: "javascript"
      }
    );
    expect(records[0]).toEqual(
      expect.objectContaining({
        title: "Old proposal",
        proposalStatus: "inactive: Withdrawn; replaced by New proposal"
      })
    );
    expect(records[0].proposalStatus).not.toMatch(/[<[\]]/);
  });
});
