# Plan

## Goal

Restore an advisory-free production dependency graph so the verified supported-
languages change can be deployed safely.

## Scope

- Override the vulnerable transitive PostCSS and Undici releases with the
  smallest patched releases in their existing major versions.
- Regenerate and review the npm lockfile.
- Record why the overrides are required and when they should be removed.
- Run the complete release verification, update the existing draft pull
  request, deploy to Cloudflare Workers, and smoke-test production.

## Non-goals

- Downgrading Wrangler or the Astro Cloudflare adapter.
- Running `npm audit fix --force`.
- Updating unrelated direct dependencies.
- Changing application behavior beyond the supported-languages disclosure UI.

## Assumptions

- PostCSS 8.5.25 fixes the advisory affecting versions through 8.5.22.
- Undici 7.29.0 fixes the advisories affecting versions through 7.28.0 while
  remaining compatible with Miniflare's Undici 7 API usage.
- The overrides are temporary and should be removed after the Cloudflare tool
  chain resolves to non-vulnerable transitive releases without them.

## Steps

1. Add exact npm overrides for PostCSS 8.5.25 and Undici 7.29.0.
2. Update the lockfile and confirm the installed dependency tree.
3. Record the temporary transitive-security decision and current project state.
4. Run the production audit and full release verification, including Wrangler
   dry-run and startup checks.
5. Commit and push the reviewed dependency update to the existing draft pull
   request.
6. Deploy the verified commit and smoke-test the production domain.

## Verification

- `npm audit --omit=dev`
- `npm ls postcss undici miniflare wrangler @astrojs/cloudflare`
- `python3 scripts/verify.py --mode ci --full`
- `npm run check:worker`
- Production HTTP and browser smoke checks for `/languages?ui=ja`.

## Open Issues

- Remove the overrides once supported Cloudflare packages no longer pin a
  vulnerable Undici release and Vite naturally resolves a patched PostCSS.
