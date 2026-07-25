import { execFileSync, spawnSync } from "node:child_process";
import { affectedSearchIndexKeys } from "./search-index/change-scope.mjs";

const rawArgs = process.argv.slice(2);
const explicitFiles = optionValues(rawArgs, "--changed-file");
const all = rawArgs.includes("--all") || process.env.VERIFY_FULL === "1";
const allowedArgumentIndexes = new Set();
for (let index = 0; index < rawArgs.length; index += 1) {
  if (rawArgs[index] === "--changed-file") allowedArgumentIndexes.add(index + 1);
}
rawArgs.forEach((argument, index) => {
  if (
    argument === "--all" ||
    argument === "--changed-file" ||
    allowedArgumentIndexes.has(index) ||
    argument.startsWith("--changed-file=")
  ) {
    return;
  }
  throw new Error(`Unknown argument: ${argument}`);
});

const changedFiles =
  explicitFiles.length > 0
    ? explicitFiles
    : changedFilesFromEnvironment() ?? discoverLocalChanges();
const selectedKeys = all ? null : affectedSearchIndexKeys(changedFiles);

if (selectedKeys?.length === 0) {
  console.log("No live search-index source is affected.");
  process.exit(0);
}

const sourceArguments = selectedKeys
  ? selectedKeys.flatMap((key) => ["--source", key])
  : [];
console.log(
  selectedKeys
    ? `Live search-index scope: ${selectedKeys.join(", ")}`
    : "Live search-index scope: all sources"
);
runNode([
  "scripts/generate-search-index.mjs",
  "--check",
  ...sourceArguments
]);
runNode([
  "scripts/verify-live-search-index.mjs",
  ...sourceArguments
]);

function changedFilesFromEnvironment() {
  const source = process.env.VERIFY_CHANGED_FILES_JSON;
  if (!source) return undefined;
  const parsed = JSON.parse(source);
  if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === "string")) {
    throw new Error("VERIFY_CHANGED_FILES_JSON must be a JSON string array.");
  }
  return parsed;
}

function discoverLocalChanges() {
  const tracked = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "--no-renames",
      "--diff-filter=ACDMRTUXB",
      "HEAD"
    ],
    { encoding: "utf8" }
  );
  const untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { encoding: "utf8" }
  );
  return [...new Set(`${tracked}\n${untracked}`.split("\n").filter(Boolean))];
}

function optionValues(args, option) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === option) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${option} requires a value.`);
      }
      values.push(value);
      index += 1;
    } else if (argument.startsWith(`${option}=`)) {
      const value = argument.slice(option.length + 1);
      if (!value) throw new Error(`${option} requires a value.`);
      values.push(value);
    }
  }
  return values;
}

function runNode(arguments_) {
  const result = spawnSync(process.execPath, arguments_, {
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
