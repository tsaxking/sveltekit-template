# structs

Database structure definitions and data models for the application. This directory contains all the Drizzle Struct definitions that define the database schema, validation rules, and business logic for core application entities.

This directory contains:

- [account.ts](src/lib/server/structs/account.ts) - User account management with authentication and profile data
- [analytics.ts](src/lib/server/structs/analytics.ts) - Analytics data collection and metrics tracking
- [email.ts](src/lib/server/structs/email.ts) - Email sending, templating, and delivery management
- [limiting.ts](src/lib/server/structs/limiting.ts) - Rate limiting and API throttling controls
- [log.ts](src/lib/server/structs/log.ts) - Application logging and audit trail functionality
- [permissions.ts](src/lib/server/structs/permissions.ts) - Role-based access control and permission management
- [session.ts](src/lib/server/structs/session.ts) - User session management and authentication state
- [testing.ts](src/lib/server/structs/testing.ts) - Testing utilities and test data management
