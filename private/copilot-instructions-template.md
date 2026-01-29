# Copilot instructions

## Big picture architecture

- SvelteKit app with a custom “Struct” data layer built on drizzle-struct. Server-side structs live in src/lib/server/structs and are registered/guarded in src/lib/server/services/struct-registry; client-side Struct API lives in src/lib/services/struct (used from Svelte pages like src/routes/examples/struct/csr/+page.svelte).
- Client/server RPC boundary for Structs is implemented in src/lib/remotes/struct.remote.ts using SvelteKit `command`/`query` with Zod validation and permission checks.
- App bootstrap is in src/hooks.server.ts: initializes Redis, builds Structs, wires struct event services, and generates the route tree at startup.
- Route tree generation is centralized in scripts/create-route-tree.ts and writes private/route-tree.pages; Limiting reads private/blocked.pages and private/ip-limited.pages in src/lib/server/structs/limiting.ts and is enforced in src/hooks.server.ts.
- Production server is a small Express wrapper in src/server.js that mounts the SvelteKit handler.

## Config and environment conventions

- config.json is required and validated via src/lib/server/utils/env.ts with config/schema from config/config.schema.json; copy config.example.json to config.json for local setup.
- env helper in src/lib/server/utils/env.ts auto-updates .env.example during dev when new keys are requested.

## Developer workflows (project-specific)

- Build uses route-tree generation: `pnpm build` runs `pnpm route-tree` then `vite build` (see package.json).
- Local dev: `pnpm dev`. Production: `pnpm build` then `pnpm start` (Express entrypoint).
- CLI utilities live in cli/ and run with `pnpm cli` (vite-node entry). Automation scripts live in scripts/ and run with `pnpm script <script-name>` (see scripts/README.md).
- Database: Drizzle config in drizzle.config.ts points at src/lib/server/structs/\*.ts. Use `pnpm db:push`, `pnpm db:migrate`, `pnpm db:studio`.
- Tests: unit tests via `pnpm test:unit` (vitest), e2e via Playwright in e2e/ (`pnpm test:e2e` builds first, preview server on port 4173 per playwright.config.ts). Artifacts go to test-results/.

## Codebase patterns to follow

- Struct models are defined as `new Struct({ name, structure })` in src/lib/server/structs/\* and often have lifecycle hooks (see src/lib/server/structs/permissions.ts, limiting.ts).
- Front-end data access typically uses the Struct client service from src/lib/services/struct and expects server-side permissions enforced in struct.remote.ts.
- When adding routes, remember route-tree generation and private/\*.pages side effects; update scripts/create-route-tree.ts or related usage if paths change.

## Key reference files

- src/hooks.server.ts (server bootstrap + limiting + route tree)
- src/lib/remotes/struct.remote.ts (RPC boundary + permissions)
- src/lib/services/struct/struct.ts (client Struct API)
- src/lib/server/structs/\* (DB schema + rules)
- scripts/create-route-tree.ts (route tree generation)
- config/config.schema.json and src/lib/server/utils/env.ts (config/env)

## Custom Scripting

- Custom scripts are located in the `scripts/` directory.
- These scripts can be executed using the command `pnpm script <script-name> <... args>`
- To generate a script, create a new TypeScript file in the `scripts/` directory and ensure it has a default export function.
- The arguments passed to the script can be accessed as separate string parameters in the default export function.

## Key links

- [Svelte](https://svelte.dev/llms-full.txt)
- [Ag Grid](https://www.ag-grid.com/javascript-data-grid/getting-started/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [TS Utils](https://github.com/tsaxking/ts-utils)
- [Drizzle Struct](https://github.com/tsaxking/drizzle-struct)

## Docs

The below docs are auto-generated from the `scripts/build-docs.ts` script and are designed to work with GitHub Pages. Only external links will work correctly.
