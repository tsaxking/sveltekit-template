# src/lib/services/struct

This directory contains the `Struct` service, which is responsible for managing data structures (structs) in the front-end that mirror the back-end data structures. Structs are used to define the shape of data and provide methods for interacting with that data, including real-time updates via server-sent events (SSE).

## Conventions

- All `Struct` instances must be created inside namespaces inside the `src/lib/model` directory. (View `src/lib/model/README.md` for struct conventions and an example).
- Utilize best practices for reactivity when using structs in Svelte components. Do not mutate struct data directly, instead use the methods provided by `src/lib/services/writables` `WritableBase` methods to ensure proper reactivity.
