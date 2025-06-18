# redis.ts

Redis is a service that provides a connection to a Redis server, which is primarily used for caching and pub/sub messaging between different processes. It is designed to be used in a server-side context, allowing for efficient data storage and retrieval, as well as real-time communication between different parts of the application.

In this service, you have 4 available sub-services:
- `createListeningService(name: string, events: { [key: string]: ZodType })` Which creates a listening service that subscribes to another process of that name and will listen for events that are defined in the `events` object. This is useful for receiving real-time updates from other processes with strict type safety.
- `emit(name: string, data: unknown)` Which emits an event to the Redis server for other processes using `createListeningService` to listen for. This is useful for sending data to other processes in real-time.
- `query(service: string, event: string, data: unknown, returnType: ZodType, timeout?: number)` Which queries another process for data and returns the result. This is useful for requesting data from other processes in a type-safe manner.

This is a file located at src/lib/server/services/redis.ts.