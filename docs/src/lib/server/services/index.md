# services

Business logic services and external integrations providing core application functionality. This directory contains service modules that handle specific business domains and external system interactions.

This directory contains:

- [email.ts](src/lib/server/services/email.ts) - Email service integration and sending functionality
- [env.ts](src/lib/server/services/env.ts) - Environment variable validation and configuration management
- [global-events.ts](src/lib/server/services/global-events.ts) - Application-wide event system and event bus
- [ntp.ts](src/lib/server/services/ntp.ts) - Network Time Protocol service for accurate time synchronization
- [sse.ts](src/lib/server/services/sse.ts) - Server-Sent Events implementation for real-time communication
- [struct-event.ts](src/lib/server/services/struct-event.ts) - Database struct event handling and lifecycle management
- [uuid.ts](src/lib/server/services/uuid.ts) - UUID generation service for unique identifiers
