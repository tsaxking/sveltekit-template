# src/lib/utils

This directory contains utility functions and classes that are used throughout the application. These utilities are designed to be reusable and modular, providing common functionality that can be leveraged by different parts of the application.

## Conventions

- These files should not maintain their own state. If managed state is required, consider placing the code in a service instead. (View `src/lib/services/README.md` for service conventions).
- Utility functions should be pure functions whenever possible, meaning they should not have side effects and should return the same output for the same input.
- If a utility could potentially be unstable, use `attemptAsync` or `attempt` from `ts-utils` to handle errors gracefully.
- If a utility is too complicated for a single fuction and is stateful, it can be a short-lived class. If it is long-lived or singleton, it should be placed in `src/lib/services`.

## Caveats

- Some of the functions in this directory were written before the introduction of services and may violate the conventions mentioned above. This will be addressed in future releases.
