# scripts

This directory contains utility scripts for development, deployment, and maintenance tasks. These scripts help automate common operations such as database backups, configuration setup, documentation generation, and testing.

This directory contains:

- [backup.ts](scripts/backup.ts) - Creates database backups with compression and date stamping
- [build-config.ts](scripts/build-config.ts) - Generates configuration files for Nginx and other services
- [build-docs.ts](scripts/build-docs.ts) - Builds the documentation site and generates search indices
- [create-route-tree.ts](scripts/create-route-tree.ts) - Generates route tree structure for the application
- [create-test-role.ts](scripts/create-test-role.ts) - Creates test user roles for development
- [fix-readme.ts](scripts/fix-readme.ts) - Updates and fixes README file formatting and links
- [generate-doc-mds.ts](scripts/generate-doc-mds.ts) - Generates markdown documentation files from TypeScript source
- [index.ts](scripts/index.ts) - Main script runner and entry point for all scripts
- [lowercase-username.ts](scripts/lowercase-username.ts) - Utility to normalize usernames to lowercase
- [mjml-batch.ts](scripts/mjml-batch.ts) - Batch processes MJML email templates
- [remove-universes.ts](scripts/remove-universes.ts) - Removes unused universe data from the database
- [restore.ts](scripts/restore.ts) - Restores database from backup files
- [test-email.ts](scripts/test-email.ts) - Sends test emails for email system validation
- [test-schema.ts](scripts/test-schema.ts) - Validates database schema integrity
- [test.ts](scripts/test.ts) - General testing utilities and test runner
