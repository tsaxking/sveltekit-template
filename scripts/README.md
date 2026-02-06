# Scripts

This folder contains project maintenance and automation scripts executed via the script runner in package.json.

## How to run

Use the script runner:

- `pnpm script <script-name> <...args>`

The runner lives at scripts/index.ts and is wired in package.json as the script command.

## Common scripts (from package.json)

- `pnpm route-tree`: generates the route tree used by the app.
- `pnpm build:docs`: builds the static documentation site.
- `pnpm build:email`: builds MJML email templates.
- `pnpm test:schema`: validates the schema.
- `pnpm test:integration`: runs integration tests.
- `pnpm backup`: creates a backup.
- `pnpm restore`: restores from a backup.
- `pnpm fix-readme`: normalizes README formatting.

## Notes

- The arguments passed to the script can be accessed as separate string parameters in the default export function.
- To generate a script, create a new TypeScript file in the `scripts/` directory and ensure it has a default export function.
- The arguments passed to the script can be accessed as separate string parameters in the default export function.
