# src/lib/services/db

This directory contains a service for interacting with the front-end indexedDB database using the [dexie](https://dexie.org/) library. It provides a convenient API for performing CRUD operations and managing data within the indexedDB. This service is designed to resemble the `src/lib/services/struct` service, which interacts with a back-end database, allowing for a consistent interface across different data storage solutions.

## Conventions

- Use this service to cache data locally in the browser for offline access and improved performance.
- Don't use this service for sensitive data, as indexedDB is not encrypted and can be accessed by malicious scripts.
- Follow the same coding conventions and patterns as used in the `src/lib/services/struct` service to maintain consistency.
- Ensure proper error handling and data validation when interacting with the indexedDB (e.g., all operations use `attemptAsync` from `ts-utils`).
- Don't let cached data become stale; implement strategies for syncing with the back-end database as needed.
