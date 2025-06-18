# sse.ts

SSE is a server-sent events (SSE) service that allows the server to push real-time updates to the client. This does not run over websockets, but rather uses a simple HTTP/HTTPS long-lived stream to send updates to the client. This is required for real-time updating and reactivity from structs on the frontend.

This is a file located at src/lib/server/services/sse.ts.