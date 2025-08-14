# Scripts

This is the entry point for all scripts in the project. To create a new script, add a new file in the directory and export a default function with optional string parameters.

## Execution

To run any script, run `pnpm script` and then find the script you want to run, enter the parameters, and it will execute. Or, you can run `pnpm scripts <script-name>` to run a specific script directly. If you run one directly, you will not be prompted to enter parameters.

This directory contains:

- [enable-timestamp-schema.ts](scripts/enable-timestamp-schema.ts)
- [premerge-render.ts](scripts/premerge-render.ts)
- [test-integration.ts](scripts/test-integration.ts)
- [backup.ts](scripts/backup.ts) - Creates a backup of the database.
- [build-config.ts](scripts/build-config.ts) - Builds the configuration files for deployment
- [build-docs.ts](scripts/build-docs.ts) - Builds the documentation site.
- [create-route-tree.ts](scripts/create-route-tree.ts) - Generates the route tree for the application. This is used for analytics to ensure no fake routes are created.
- [create-test-role.ts](scripts/create-test-role.ts) - Creates a test role in the database.
- [generate-doc-mds.ts](scripts/generate-doc-mds.ts) - Generates markdown for the whole site. This will not overwite existing files.
- [index.ts](scripts/index.ts) - The entry point for all scripts. If you run `pnpm scripts`, this is the file that will be executed.
- [lowercase-username.ts](scripts/lowercase-username.ts) - Lowercases all usernames in the database.
- [mjml-batch.ts](scripts/mjml-batch.ts) - Processes MJML files in a batch and will build the type files for them.
- [remove-universes.ts](scripts/remove-universes.ts) - This will remove all universes from the database for migration purposes. This should only be used once and only if you have the deprecated universes tables/columns in the database.
- [render-docs.ts](scripts/render-docs.ts) - Renders the documentation site.
- [restore.ts](scripts/restore.ts) - Restores the database from a backup. This will also generate a new backup file.
- [test-email.ts](scripts/test-email.ts) - Sends a test email to the specified address.
- [test-schema.ts](scripts/test-schema.ts) - Test the struct's schema against the database.
