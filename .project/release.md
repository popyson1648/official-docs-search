# Release

## When Release Is Needed

A release is needed after application, catalog, adapter, generated-index, dependency, or deployment changes.

## Release Steps

1. If refreshing upstream data, run `npm run update:search-index` and review every generated diff.
2. Run the applicable source-scoped live check, then
   `python3 scripts/verify.py --mode ci --full`.
3. Review every supported path in `public/search-index/manifest.json`: statuses, input/output hashes, versions, counts, gzip/Brotli sizes, attribution, licenses, and known queries.
4. Confirm all-language coverage, single- and multi-language search,
   non-official sources, unified EN/JA behavior, explicit `locale:` overrides,
   Japanese-to-English fallback, partial failure, support-state, mobile,
   escaping, and safe-link flows.
5. Run `npm run build && npm start` and confirm the manifest revalidates while content-addressed bundles are gzip/Brotli encoded and immutable.
6. Deploy the application and its matching `public/search-index/` artifacts together.
7. Smoke-test original-document links and response headers on the deployed site.

The scheduled weekly and monthly index updates open a draft pull request;
review it and never merge automatically.

## Required Checks

- All configured offline phases and every affected live source pass.
- Before a release that changes shared generator or transport behavior, run
  `python3 scripts/verify.py --mode all --full --include-network`.
- Known searches return non-empty semantic results from allowed original domains.
- A combined query includes each selected supported programming language.
- Planned, blocked, and disabled sources are reported explicitly.
- Production JSON compression, validators, conditional responses, and cache headers match the server contract.
- Source policy and transfer estimates remain current when an input, cadence, license, bundle format, or delivery setting changes.

## Rollback Or Recovery Notes

- Restore the previous application deployment and its matching committed index bundles together.
- Content-addressed paths let an old manifest continue to reference old bundles until the deployment is replaced.
- If one upstream input breaks, keep the last verified artifacts while repairing its adapter; never publish an empty replacement.
