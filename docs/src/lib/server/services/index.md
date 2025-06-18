# services
Server side services are programs that run alongside the main application, providing additional functionality or features. These services should only be event-driven or functional and should never have any side effects. They should only manage their own state or the state of the structs they are responsible for, and should not alter the state of the application without a good reason and be triggered by a specific event.

This directory contains:

- [env.ts](env.ts.md)
- [global-events.ts](global-events.ts.md)
- [redis.ts](redis.ts.md)
- [sse.ts](sse.ts.md)
- [struct-event.ts](struct-event.ts.md)