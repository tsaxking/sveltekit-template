# src/lib/remotes

This directory contains typesafe functions that run on the back-end but are callable by either the front-end or the back-end. In practice for this project, these functions are used by the front-end to interact with the server-side logic, never from the backend. You can view the remote docs [here](https://svelte.dev/docs/kit/remote-functions).

## Conventions

- If a struct namespace requires custom api calls, they must be placed here. Create a file named `<my-namespace>.ts` for the namespace.
- Every exported member of these files must be a valid remote function. (Read sveltekit remote-functions docs).
- All functions that require parameters must use a single parameter object defined through `zod` for type safety and validation.
- If a function is gated by authentication, use `$lib/remotes/index.ts` utility functions to help.
