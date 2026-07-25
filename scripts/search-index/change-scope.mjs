import { englishGroupAJobs } from "./jobs/english-group-a.mjs";
import { gnuJobs } from "./jobs/gnu.mjs";
import { japaneseGroupEJobs } from "./jobs/japanese-group-e.mjs";
import { microsoftGroupCJobs } from "./jobs/microsoft-group-c.mjs";
import { multilingualGroupBJobs } from "./jobs/multilingual-group-b.mjs";
import { remainingGroupDJobs } from "./jobs/remaining-group-d.mjs";
import { replacementGroupFJobs } from "./jobs/replacements-group-f.mjs";
import { trustedCommunityGroupAJobs } from "./jobs/trusted-community-group-a.mjs";
import { trustedCommunityGroupBJobs } from "./jobs/trusted-community-group-b.mjs";
import { trustedCommunityGroupCJobs } from "./jobs/trusted-community-group-c.mjs";

const groupRules = [
  {
    files: [
      "scripts/search-index/jobs/english-group-a.mjs",
      "scripts/search-index/english-group-a-parsers.mjs"
    ],
    jobs: englishGroupAJobs
  },
  {
    files: [
      "scripts/search-index/jobs/japanese-group-e.mjs",
      "scripts/search-index/japanese-group-e-parsers.mjs"
    ],
    jobs: japaneseGroupEJobs
  },
  {
    files: [
      "scripts/search-index/jobs/microsoft-group-c.mjs",
      "scripts/search-index/parsers/microsoft-group-c.mjs"
    ],
    jobs: microsoftGroupCJobs
  },
  {
    files: [
      "scripts/search-index/jobs/multilingual-group-b.mjs",
      "scripts/search-index/parsers-group-b.mjs"
    ],
    jobs: multilingualGroupBJobs
  },
  {
    files: ["scripts/search-index/jobs/remaining-group-d.mjs"],
    jobs: remainingGroupDJobs
  },
  {
    files: ["scripts/search-index/parsers-group-d.mjs"],
    jobs: [
      ...remainingGroupDJobs,
      ...gnuJobs.filter((job) => job.sourceId === "gfortran")
    ]
  },
  {
    files: ["scripts/search-index/jobs/replacements-group-f.mjs"],
    jobs: replacementGroupFJobs
  },
  {
    files: ["scripts/search-index/parsers-group-f.mjs"],
    jobs: [
      ...replacementGroupFJobs,
      ...gnuJobs.filter((job) => job.sourceId === "gnu-objc")
    ]
  },
  {
    files: ["scripts/search-index/jobs/gnu.mjs"],
    jobs: gnuJobs
  },
  {
    files: [
      "scripts/search-index/jobs/trusted-community-group-a.mjs",
      "scripts/search-index/trusted-community-group-a-parsers.mjs"
    ],
    jobs: trustedCommunityGroupAJobs
  },
  {
    files: [
      "scripts/search-index/jobs/trusted-community-group-b.mjs",
      "scripts/search-index/trusted-community-group-b-parsers.mjs"
    ],
    jobs: trustedCommunityGroupBJobs
  },
  {
    files: [
      "scripts/search-index/jobs/trusted-community-group-c.mjs",
      "scripts/search-index/trusted-community-group-c-parsers.mjs"
    ],
    jobs: trustedCommunityGroupCJobs
  }
];

const allSourceFiles = new Set([
  "scripts/generate-search-index.mjs",
  "scripts/search-index-generator.mjs",
  "scripts/search-index.mjs",
  "scripts/search-index/http-fetch.mjs",
  "scripts/search-index/job-helpers.mjs",
  "src/data/docs-sources.toml"
]);

const noLiveFiles = new Set([
  "scripts/search-index-generator.d.mts",
  "scripts/search-index.d.mts",
  "scripts/verify-live-search-index.mjs",
  "scripts/search-index/change-scope.mjs",
  "scripts/verify-affected-search-index.mjs"
]);

export function affectedSearchIndexKeys(changedFiles) {
  const normalized = [
    ...new Set(
      changedFiles
        .map((path) => String(path).replaceAll("\\", "/").replace(/^\.\//, ""))
        .filter(Boolean)
    )
  ];
  if (normalized.some((path) => allSourceFiles.has(path))) return null;

  const selected = new Set();
  for (const path of normalized) {
    if (noLiveFiles.has(path)) continue;
    let matched = false;
    for (const rule of groupRules) {
      if (!rule.files.includes(path)) continue;
      matched = true;
      for (const job of rule.jobs) {
        selected.add(`${job.sourceId}/${job.docsLocale}`);
      }
    }
    if (
      !matched &&
      (path.startsWith("scripts/search-index/jobs/") ||
        path.startsWith("scripts/search-index/parsers"))
    ) {
      return null;
    }
  }
  return [...selected].sort();
}

export function gnuSearchIndexKeys() {
  return gnuJobs
    .map((job) => `${job.sourceId}/${job.docsLocale}`)
    .sort();
}
