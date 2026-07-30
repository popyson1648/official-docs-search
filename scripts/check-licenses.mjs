import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* Licenses that impose no reciprocal obligation on this project's own code or
   on the artifacts it deploys. */
export const PERMISSIVE_LICENSES = new Set([
  "0BSD",
  "Apache-2.0",
  "BlueOak-1.0.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "CC0-1.0",
  "ISC",
  "MIT",
  "MIT-0",
  "Python-2.0",
  "Unlicense"
]);

/* Weak-copyleft dependencies are allowed only where they were reviewed and the
   obligation stays inside a build-time tool. None of these ship in the Worker
   bundle, which contains no native binary and no CSS transformer. */
export const REVIEWED_WEAK_COPYLEFT = [
  {
    prefix: "@img/sharp-",
    reason: "LGPL-3.0 libvips binaries behind Astro's build-time image tooling."
  },
  {
    prefix: "lightningcss",
    reason: "MPL-2.0 CSS transformer executed during the build."
  }
];

const WEAK_COPYLEFT_PATTERN = /^(LGPL|MPL|EPL|CDDL)-/;
const STRONG_COPYLEFT_PATTERN = /^(AGPL|GPL|SSPL|OSL|EUPL)-/;

export function packageNameFromLockPath(path) {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  return index === -1 ? path : path.slice(index + marker.length);
}

export function isReviewedWeakCopyleft(packageName) {
  return REVIEWED_WEAK_COPYLEFT.some((entry) =>
    packageName.startsWith(entry.prefix)
  );
}

/* Evaluates the subset of SPDX expressions npm packages actually publish:
   single identifiers, OR alternatives, and AND combinations. */
export function evaluateLicense(expression, packageName) {
  if (typeof expression !== "string" || expression.trim() === "") {
    return { ok: false, problem: "declares no license" };
  }
  const normalized = expression.replaceAll("(", " ").replaceAll(")", " ").trim();
  if (normalized.includes(" OR ")) {
    const alternatives = normalized.split(" OR ").map((part) => part.trim());
    const accepted = alternatives.find(
      (alternative) => evaluateLicense(alternative, packageName).ok
    );
    return accepted
      ? { ok: true, license: accepted }
      : { ok: false, problem: `offers only ${alternatives.join(" or ")}` };
  }
  if (normalized.includes(" AND ")) {
    for (const term of normalized.split(" AND ").map((part) => part.trim())) {
      const result = evaluateLicense(term, packageName);
      if (!result.ok) return result;
    }
    return { ok: true, license: normalized };
  }

  const license = normalized.replace(/\+$/, "").replace(/-or-later$|-only$/, "");
  if (PERMISSIVE_LICENSES.has(license)) return { ok: true, license: normalized };
  if (STRONG_COPYLEFT_PATTERN.test(license)) {
    return { ok: false, problem: `uses strong copyleft ${normalized}` };
  }
  if (WEAK_COPYLEFT_PATTERN.test(license)) {
    return isReviewedWeakCopyleft(packageName)
      ? { ok: true, license: normalized, reviewed: true }
      : { ok: false, problem: `uses unreviewed weak copyleft ${normalized}` };
  }
  return { ok: false, problem: `uses unrecognized license ${normalized}` };
}

export function collectProductionLicenses(lockfile, readPackageLicense) {
  const entries = [];
  for (const [path, info] of Object.entries(lockfile.packages ?? {})) {
    if (path === "" || info.dev || info.devOptional || info.link) continue;
    const name = info.name ?? packageNameFromLockPath(path);
    const declared = info.license ?? readPackageLicense?.(path);
    entries.push({ path, name, license: declared });
  }
  return entries;
}

export function reviewLicenses(entries) {
  const failures = [];
  const reviewed = [];
  for (const entry of entries) {
    const license =
      typeof entry.license === "string"
        ? entry.license
        : Array.isArray(entry.license)
          ? entry.license.map((item) => item.type ?? item).join(" OR ")
          : entry.license;
    const result = evaluateLicense(license, entry.name);
    if (!result.ok) failures.push(`${entry.name} ${result.problem}`);
    else if (result.reviewed) reviewed.push(`${entry.name} (${result.license})`);
  }
  return { failures, reviewed };
}

function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const lockfile = JSON.parse(
    readFileSync(join(root, "package-lock.json"), "utf8")
  );
  const entries = collectProductionLicenses(lockfile, (path) => {
    const manifest = join(root, path, "package.json");
    if (!existsSync(manifest)) return undefined;
    const parsed = JSON.parse(readFileSync(manifest, "utf8"));
    return parsed.license ?? parsed.licenses;
  });
  const { failures, reviewed } = reviewLicenses(entries);

  console.log(`Checked ${entries.length} production dependencies.`);
  if (reviewed.length > 0) {
    console.log(
      `Reviewed weak-copyleft build tools: ${reviewed.length} packages ` +
        `(${REVIEWED_WEAK_COPYLEFT.map((entry) => entry.prefix).join(", ")}).`
    );
  }
  if (failures.length > 0) {
    console.error(
      `Unacceptable dependency licenses:\n${failures.map((line) => `  ${line}`).join("\n")}`
    );
    process.exitCode = 1;
    return;
  }
  console.log("All production dependency licenses are acceptable.");
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
