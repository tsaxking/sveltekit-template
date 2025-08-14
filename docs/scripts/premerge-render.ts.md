# premerge-render.ts

This file is meant to be run exclusively on sveltekit-template's ./.github/workflows/merge-template.yml

Its sole purpose is to change the state of the repository to be ready for the child repositories.

## Things it does:

- Corrects the README.md file to have the correct name and badge urls.
- Changes the doc's urls to the target repository
