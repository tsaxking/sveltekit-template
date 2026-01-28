
# Scripts

This folder contains project maintenance and automation scripts executed via the script runner in package.json.

## How to run

Use the script runner:

- pnpm script <script-name>

The runner lives at scripts/index.ts and is wired in package.json as the script command.

## Common scripts (from package.json)

- pnpm route-tree: generates the route tree used by the app.
- pnpm build:docs: generates markdown docs (build-docs script).
- pnpm deploy:docs: builds docs for deployment.
- pnpm build:email: builds MJML email templates.
- pnpm test:schema: validates the schema.
- pnpm test:integration: runs integration tests.
- pnpm backup: creates a backup.
- pnpm restore: restores from a backup.
- pnpm fix-readme: normalizes README formatting.

## Notes

- Some scripts read config.json or env files; ensure configuration is set up before running.
- For ad-hoc scripts, add a new file in this folder and wire it through scripts/index.ts.
