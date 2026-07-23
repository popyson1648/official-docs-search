# Structure

## Top-level Directories

- `src/client/`: browser controllers, result rendering, and search worker.
- `src/core/`: framework-independent query, catalog, runtime, and ranking logic.
- `src/data/`: canonical source, locale, and support-state catalog.
- `src/pages/`: Astro routes and server-rendered shells.
- `scripts/`: adapters, reproducible publication, live verification, and production serving.
- `public/search-index/`: committed compact indexes and manifest.
- `tests/`: unit, integration, server-contract, live-data, and browser verification.
- `.plans/` and `.decisions/`: task and architecture history.

## Important Modules

- Document query parsing, catalog/support resolution, compact-tuple ranking, runtime fetching, pure client helpers, browser controllers, the worker, source adapters, deterministic publication, live verification, and production serving.

## Runtime Data Flow

1. Resolve query, catalog scope, locale, and selected sources on the server.
2. Fetch the complete status manifest in the client runtime.
3. Fetch and search only matching supported bundles in a worker.
4. Render original HTTPS links and explicit unsupported states.

## Areas That Require Extra Care

- Keep generated bundles synchronized with their adapters.
- Report unsupported sources instead of silently returning an empty list.
- Store only necessary index metadata and link to original documentation pages.
- Keep DOM controllers in `src/client/` and reusable logic in `src/core/`.
- Keep source policy, transfer estimates, tests, and artifacts synchronized with adapter or delivery changes.
