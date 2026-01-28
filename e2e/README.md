# End-to-end tests

This folder contains Playwright-based end-to-end tests for the app. Use these tests to validate critical user flows, permissions, and file upload behavior against a built or running application.

## What lives here

- Test specs in this folder (for example, account flows, permissions, and file uploads).
- Shared helpers in test-utils.ts.
- Artifacts are written to test-results/ at the repo root.

## Running tests

Scripts are defined in package.json:

- `pnpm test:e2e`: builds first (pnpm build) then runs Playwright.
- `pnpm test:e2e:no-build`: runs Playwright without rebuilding.
- `pnpm test` runs schema checks, unit tests, then end-to-end tests.

Use `test:e2e` for CI or clean runs, and test:e2e:no-build for faster local iteration when the app is already built.

## Tips

- Ensure the app is configured (env/config) before running tests.
- If you need to debug a single spec, run Playwright with its CLI flags (see playwright.config.ts).
