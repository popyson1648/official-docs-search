# Decision

## Title

Gate production dependency licenses in verification

## Date

2026-07-30

## Status

Accepted

## Decision

`scripts/check-licenses.mjs` reviews every non-development entry in
`package-lock.json` and runs as the `licenses` verification phase before push and
in CI. It fails on strong copyleft, undeclared, and unrecognized licenses, and
accepts weak copyleft only for the reviewed build-time packages named in the
script: the `@img/sharp-` libvips binaries (LGPL-3.0-or-later) and
`lightningcss` (MPL-2.0).

## Context

The engineering legal checkpoint guide lists automatic OSS license detection in
CI as a pre-release item and treats a GPL or AGPL dependency as an escalation
trigger. The project had `npm audit` for vulnerabilities but no license check.
Reviewing the current tree found 382 production packages: 276 MIT, 35 Apache-2.0,
and smaller permissive groups, plus 26 LGPL-3.0 packages behind `sharp` and 12
MPL-2.0 `lightningcss` packages. Both are build-time tools; the deployed bundle
was searched and contains neither, since Workers cannot load native modules and
CSS is transformed before deployment.

## Alternatives

- Add a third-party license scanner: more coverage of SPDX corner cases, at the
  cost of another production-adjacent dependency for a three-dependency project.
- Check licenses by hand at release time: the finding above shows the tree is
  large enough that a manual pass would not be repeated reliably.
- Fail on every copyleft license: would block the current Astro build toolchain
  and force either a fork or an unexplained exception.

## Reason

A lockfile-driven check needs no new dependency, runs offline in under a second,
and answers the exact question the checklist asks. Splitting strong from weak
copyleft keeps the gate honest: reciprocal obligations that would reach deployed
code fail outright, while build-time tools are allowed only where the review is
written down next to the rule.

## Consequences

- A new dependency under GPL, AGPL, SSPL, or with no declared license fails
  verification before it can be pushed.
- A new weak-copyleft dependency fails until someone reviews whether it is
  redistributed and records the outcome.
- The allowlist is by package-name prefix, so it must be re-examined if `sharp`
  or `lightningcss` ever moves into the runtime bundle.

## Revisit Conditions

Revisit if the deployment starts bundling native modules or CSS tooling, if the
dependency tree grows beyond what a name-prefix allowlist can describe, or if a
maintained scanner becomes cheaper to keep correct than this script.
