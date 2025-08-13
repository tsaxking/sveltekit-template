# Github Actions

[code-formatter.yml](https://github.com/tsaxking/sveltekit-template/tree/main/.github/workflows/code-formatter.yml) - Ensure code is formatted and linted correctly. If this fails, it's likely due to a syntax error in your code preventing compilation.

[gh-pages.yml](https://github.com/tsaxking/sveltekit-template/tree/main/.github/workflows/gh-pages.yml) - Generate documentation using `docsify`.

[merge-template.yml](https://github.com/tsaxking/sveltekit-template/tree/main/.github/workflows/merge-template.yml) - Whenever there is a new release, this workflow will create a branch with the latest changes in the sub repositories.

[testing-e2e.yml](https://github.com/tsaxking/sveltekit-template/tree/main/.github/workflows/testing-e2e.yml) - Run end to end tests. (e2e/)

[testing-svelte-check.yml](https://github.com/tsaxking/sveltekit-template/tree/main/.github/workflows/testing-svelte-check.yml) - Run tsc checks, ensures types are correct.

[testing-unit.yml](https://github.com/tsaxking/sveltekit-template/tree/main/.github/workflows/testing-unit.yml) - Run unit tests. (src/tests)
