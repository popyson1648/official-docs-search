# Testing

## Test Types

- Unit tests use Vitest.
- Build verification uses Astro's production build.
- UI smoke checks can be done with a local dev server and browser automation.

## Minimum Checks Before Completion

Run:

```sh
python3 scripts/verify.py
```

## Checks By Change Type

- Query syntax changes: update and run `tests/query.test.ts`.
- Source catalog resolution changes: update and run `tests/sources.test.ts`.
- UI changes: run the dev server and check desktop and mobile widths.
- Build/config changes: run the full verification script.

## How To Run Verification

```sh
python3 scripts/verify.py
```

The verification phases are configured in `.project/verification.toml`.
