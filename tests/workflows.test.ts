import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const { load: parseYaml } = createRequire(import.meta.url)("js-yaml") as {
  load: (source: string) => any;
};

function workflow(name: string): any {
  return parseYaml(
    readFileSync(resolve(root, ".github/workflows", name), "utf8")
  );
}

describe("GitHub Actions workflows", () => {
  it("classifies both pull-request and push ranges before Node setup", () => {
    const steps = workflow("ci.yml").jobs.verify.steps;
    const classifyIndex = steps.findIndex(
      (step: any) => step.name === "Classify changed files"
    );
    const nodeIndex = steps.findIndex(
      (step: any) => step.uses === "actions/setup-node@v4"
    );
    const classify = steps[classifyIndex];

    expect(classifyIndex).toBeGreaterThan(-1);
    expect(classifyIndex).toBeLessThan(nodeIndex);
    expect(classify.run).toContain('change_range="${PR_BASE_SHA}...HEAD"');
    expect(classify.run).toContain('change_range="${PUSH_BEFORE_SHA}..HEAD"');
    expect(classify.run).toContain("--changed-range");
    expect(steps[nodeIndex].if).toContain("phase_count");
  });

  it("keeps weekly and monthly index updates in separate branches", () => {
    const source = readFileSync(
      resolve(root, ".github/workflows/update-search-index.yml"),
      "utf8"
    );
    const parsed = workflow("update-search-index.yml");
    const generate = parsed.jobs.update.steps.find(
      (step: any) => step.name === "Generate and verify indexes"
    );

    expect(source).toContain('UPDATE_BRANCH=automation/search-index-update-$scope');
    expect(generate.run).toContain('selection=(--frequency "$scope")');
    expect(generate.run).not.toContain("check:search-index");
    expect(source).toContain('cron: "23 3 * * 1"');
    expect(source).toContain('cron: "23 4 1 * *"');
  });

  it("retains a scheduled dependency audit", () => {
    const parsed = workflow("security-audit.yml");
    const steps = parsed.jobs.audit.steps;

    expect(
      steps.some((step: any) => step.run === "npm audit --omit=dev")
    ).toBe(true);
    expect(
      readFileSync(
        resolve(root, ".github/workflows/security-audit.yml"),
        "utf8"
      )
    ).toContain("schedule:");
  });
});
