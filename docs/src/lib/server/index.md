# server

Server-side functionality and backend infrastructure for the SvelteKit application. This directory contains all server-only code including database models, API utilities, services, and event handling systems.

This directory contains:

- [db](src/lib/server/db/index) - Database configuration, connection management, and schema definitions
- [event-handler.ts](src/lib/server/event-handler.ts) - Centralized event handling and request processing
- [index.ts](src/lib/server/index.ts) - Main server exports and public API surface
- [services](src/lib/server/services/index) - Business logic services and external integrations
- [structs](src/lib/server/structs/index) - Database structure definitions and data models
- [utils](src/lib/server/utils/index) - Server-side utility functions and helpers
