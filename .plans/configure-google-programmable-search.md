# Plan

## Goal

Configure Google Programmable Search so the application renders real search results instead of the missing-`PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX` setup notice.

## Scope

- Configure the local Astro development environment with the project's Google Programmable Search Engine ID.
- Ensure local-only environment configuration cannot be committed accidentally.
- Restart the development server so Astro reloads the environment value.
- Verify that the Google Search Element loads and returns a results UI for a representative query.
- Document the corresponding production environment variable if the deployment workflow requires it.

## Non-goals

- Hiding the setup notice while leaving search non-functional.
- Replacing Google Programmable Search with another search provider.
- Changing the TOML source catalog or generated XML contents.
- Merging the branch.

## Assumptions

- The user owns or can create the Google Programmable Search Engine used by this project.
- The Search engine ID recovered from the local shell history on 2026-07-22 is the engine created for this project on 2026-06-19.
- The Search engine ID is public configuration, but the local environment file should remain untracked.
- The existing generated `public/search/annotations.xml` and `public/search/context.xml` files will be uploaded through the Google control panel when creating or refreshing the engine.

## Steps

1. Obtain the Search engine ID (`cx`) from the Google Programmable Search control panel.
2. Add the ID to a local Astro environment file as `PUBLIC_GOOGLE_PROGRAMMABLE_SEARCH_CX` and exclude that local file from Git tracking.
3. If production deployment is in scope, configure the same variable in the deployment environment and record the exact project-specific procedure.
4. Restart the currently running Astro development server.
5. Exercise a representative search and confirm that `cse.js` loads with the configured ID and the results element renders without the setup notice.
6. Run `python3 scripts/verify.py` and review the final diff for unrelated changes.

## Verification

- Confirm the rendered page includes `https://cse.google.com/cse.js?cx=...` without printing the ID in logs or the completion report.
- Confirm the missing-CX setup notice is absent for a valid query.
- Confirm a Google results container is rendered and initializes in the browser.
- Run `python3 scripts/verify.py`.

## Open Issues

- The Search engine ID recovered from local shell history was confirmed by successfully loading the configured engine and rendering results.
- The production hosting provider is not recorded in the repository; production configuration needs the provider/project name.
