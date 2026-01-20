import { attempt, attemptAsync } from 'ts-utils/check';
import type { RequestEvent as ConnectRequestEvent } from '../../../routes/api/sse/init/[uuid]/$types';
import { Session } from '../structs/session';
import { encode } from 'ts-utils/text';
import { EventEmitter } from 'ts-utils/event-emitter';
import type { Notification } from '$lib/types/notification';
import { toByteString } from 'ts-utils/text';
import { getManifestoInstance } from '../utils/manifesto';
import { config } from '../utils/env';
import { type ConnectionState } from '$lib/types/sse';

/** Maximum number of cached messages per connection */
const CACHE_LIMIT = 50;
/** Time to live for cached messages in milliseconds */
const CACHE_TTL = 30000;
/** Interval for pinging connections and cleanup in milliseconds */
const PING_INTERVAL = 10000;
/** Timeout for disconnecting inactive connections in milliseconds */
const DISCONNECT_TIMEOUT = 35000;

const log = (...args: unknown[]) => {
	if (config.sse.debug) {
		console.log('[SSE]', ...args);
	}
};

/**
 * Represents a single Server-Sent Events (SSE) connection to a client.
 * Handles message delivery, caching, acknowledgments, and connection lifecycle.
 *
 * @example
 * ```typescript
 * const connection = new Connection(uuid, sessionId, controller, onClose);
 * connection.send('user-update', { id: 123, name: 'John' });
 * connection.notify({ title: 'Welcome', message: 'You are now connected', severity: 'success' });
 * ```
 *
 * Features:
 * - Message caching and retry logic for reliability
 * - Automatic cleanup to prevent memory leaks
 * - Session integration for user context
 * - Ping/pong heartbeat mechanism
 * - Graceful connection closure
 */
export class Connection {
	/** Timestamp of the last ping received from this connection */
	public lastPing = Date.now();

	private readonly em = new EventEmitter<{
		close: void;
		'state-change': Connection;
	}>();

	private lastReport = 0;

	public readonly on = this.em.on.bind(this.em);
	public readonly off = this.em.off.bind(this.em);
	public readonly emit = this.em.emit.bind(this.em);
	public readonly once = this.em.once.bind(this.em);

	/** Cache of messages awaiting acknowledgment from the client */
	private cache: {
		event: string;
		data: unknown;
		id: number;
		timestamp: number;
		retries: number;
	}[] = [];

	/** Counter for generating unique message IDs */
	private idCounter = 0;

	public state: ConnectionState | undefined;

	/**
	 * Creates a new SSE connection instance
	 * @param uuid - Unique identifier for this connection
	 * @param sessionId - ID of the associated user session
	 * @param controller - ReadableStream controller for sending data
	 * @param onClose - Callback function when connection closes
	 */
	constructor(
		public readonly uuid: string,
		public readonly sessionId: string,
		private readonly controller: ReadableStreamDefaultController<string>,
		public readonly url: string,
		public readonly sse: SSE
	) {}

	/**
	 * Checks if the connection is still active
	 * @returns True if the connection can accept data
	 */
	get connected() {
		return this.controller.desiredSize !== null;
	}

	get generalizedUrl() {
		return getManifestoInstance(this.url);
	}

	/**
	 * Sends an event to the client via Server-Sent Events
	 * @param event - Event name/type
	 * @param data - Event payload data
	 * @returns Result containing the message ID or error
	 */
	send(event: string, data: unknown) {
		return attempt(() => {
			log(`Sending event "${event}" to connection ${this.uuid}`);
			const id = this.idCounter++;
			const payload = JSON.stringify({ event, data, id });
			this.controller.enqueue(`data: ${encode(payload)}\n\n`);
			this.cache.push({ event, data, id, timestamp: Date.now(), retries: 0 });
			if (this.cache.length > CACHE_LIMIT) this.cache.shift();
			return id;
		});
	}

	/**
	 * Acknowledges receipt of messages up to the specified ID
	 * Removes acknowledged messages from the cache
	 * @param id - ID of the last acknowledged message
	 */
	ack(id: number) {
		this.cache = this.cache.filter((msg) => msg.id > id);
	}

	/**
	 * Retries sending cached messages that haven't been acknowledged
	 * Removes messages that are too old or have been retried too many times
	 * @param now - Current timestamp for age calculation
	 */
	retryCached(now: number) {
		this.cache = this.cache.filter((msg) => {
			if (now - msg.timestamp > CACHE_TTL || msg.retries >= 5) return false;
			this.controller.enqueue(
				`data: ${encode(JSON.stringify({ event: msg.event, data: msg.data, id: msg.id }))}\n\n`
			);
			msg.retries++;
			return true;
		});
	}

	/**
	 * Sends a ping message to keep the connection alive
	 * Updates the lastPing timestamp
	 */
	ping() {
		this.lastPing = Date.now();
		this.send('ping', null);
	}

	/**
	 * Closes the connection and performs cleanup
	 * Clears cache, closes controller, and notifies listeners
	 * @returns Result indicating success or failure
	 */
	closeConnection() {
		return attempt(() => {
			this.cache = [];
			this.send('close', null);
			log('Closing SSE connection:', this.uuid);
			this.em.destroyEvents();

			if (this.controller.desiredSize !== null) {
				this.controller.close();
			}
		});
	}

	/**
	 * Sends a notification to the client
	 * @param notif - Notification object with title, message, and severity
	 * @returns Result containing the message ID or error
	 */
	notify(notif: Notification) {
		return this.send('notification', notif);
	}

	/**
	 * Retrieves the session associated with this connection
	 * @returns Promise resolving to the session object
	 */
	getSession() {
		return Session.Session.fromId(this.sessionId);
	}

	/**
	 * Sends a redirect command to the client
	 * @param url - URL to redirect the client to
	 * @param reason - Optional reason for the redirect
	 */
	redirect(url: string, reason?: string) {
		this.send('sse:redirect', { url, reason });
	}

	reload(reason?: string) {
		this.send('sse:reload', { reason });
	}

	reportState(state: ConnectionState) {
		return attempt(() => {
			const now = Date.now();
			if (now - this.lastReport < config.sse.state_report_threshold) {
				throw new Error(
					`State reports are limited to once every ${config.sse.state_report_threshold} milliseconds.`
				);
			}
			this.lastReport = now;
			this.state = state;
			this.emit('state-change', this);
		});
	}
}

/**
 * Array-like wrapper for managing multiple SSE connections
 * Provides convenient methods for bulk operations on connections
 *
 * @example
 * ```typescript
 * const sessionConnections = sse.fromSession('session123');
 * sessionConnections.notify({ title: 'Alert', message: 'Your session will expire soon', severity: 'warning' });
 * sessionConnections.send('data-update', { timestamp: Date.now() });
 * ```
 */
class ConnectionArray {
	/**
	 * Creates a new connection array
	 * @param connections - Array of Connection instances to manage
	 */
	constructor(
		public readonly sessionId: string,
		public readonly connections: Connection[]
	) {}

	/**
	 * Adds a connection to this array
	 * @param connection - Connection to add
	 */
	add(connection: Connection) {
		this.connections.push(connection);
	}

	/**
	 * Removes a connection from this array
	 * @param connection - Connection to remove
	 */
	remove(connection: Connection) {
		const index = this.connections.indexOf(connection);
		if (index !== -1) this.connections.splice(index, 1);
	}

	/**
	 * Executes a callback for each connection in the array
	 * @param callback - Function to call for each connection
	 */
	each(callback: (conn: Connection) => void) {
		this.connections.forEach(callback);
	}

	/**
	 * Sends an event to all connections in this array
	 * @param event - Event name/type
	 * @param data - Event payload data
	 */
	send(event: string, data: unknown) {
		this.connections.forEach((conn) => conn.send(event, data));
	}

	/**
	 * Sends a notification to all connections in this array
	 * @param notification - Notification object to send
	 */
	notify(notification: Notification) {
		this.send('notification', notification);
	}

	/**
	 * Gets the number of connections in this array
	 */
	get length() {
		return this.connections.length;
	}
}

/**
 * Server-Side Events (SSE) service for real-time communication with clients.
 * Manages multiple connections, handles message delivery, and provides monitoring capabilities.
 *
 * @example Basic usage
 * ```typescript
 * // Send to all connections
 * sse.send('user-online', { userId: 123, timestamp: Date.now() });
 *
 * // Send to specific session
 * const sessionConnections = sse.fromSession('session-id');
 * sessionConnections.notify({ title: 'Welcome', message: 'Hello!', severity: 'info' });
 *
 * // Listen for connection events
 * sse.on('connect', (connection) => {
 *   console.log(`Client connected: ${connection.uuid}`);
 * });
 *
 * // Monitor memory usage
 * const stats = sse.getStats();
 * console.log(`Active connections: ${stats.activeConnections}`);
 * ```
 *
 * Features:
 * - Automatic connection cleanup and memory management
 * - Message caching and retry logic for reliability
 * - Session-based connection grouping
 * - Real-time monitoring and statistics
 * - Graceful shutdown handling
 * - Conditional message sending with filters
 */
export class SSE {
	/** Map of active connections indexed by UUID */
	public readonly connections = new Map<string, Connection>();

	/** Event emitter for connection lifecycle events */
	private readonly emitter = new EventEmitter<{
		connect: Connection;
		disconnect: Connection;
		'state-change': Connection;
	}>();

	/** Interval handle for periodic cleanup and ping operations */
	private cleanupInterval: NodeJS.Timeout;

	/** Event listener registration methods */
	public readonly on = this.emitter.on.bind(this.emitter);
	public readonly off = this.emitter.off.bind(this.emitter);

	/**
	 * Creates a new SSE service instance
	 * Sets up process signal handlers and starts the cleanup interval
	 */
	constructor() {
		process.on('SIGTERM', () => this.shutdown());
		process.on('exit', () => this.shutdown());

		this.cleanupInterval = setInterval(() => {
			const now = Date.now();
			for (const connection of this.connections.values()) {
				if (now - connection.lastPing > DISCONNECT_TIMEOUT) {
					log(`SSE Connection ${connection.uuid} timed out.`);
					connection.closeConnection();
				} else {
					connection.ping();
					connection.retryCached(now);
				}
			}
		}, PING_INTERVAL);
	}

	/**
	 * Gracefully shuts down the SSE service
	 * Cleans up intervals, closes all connections, and frees memory
	 */
	private shutdown() {
		log('Shutting down SSE service...');
		clearInterval(this.cleanupInterval);
		for (const conn of this.connections.values()) conn.closeConnection();
		this.connections.clear();
	}

	/**
	 * Handles new SSE connection requests from clients
	 * Creates a new Connection instance and sets up the ReadableStream
	 * @param event - SvelteKit request event containing session and UUID
	 * @returns Promise resolving to a Response with SSE stream
	 */
	connect(event: ConnectRequestEvent) {
		const me = this;
		return attemptAsync(async () => {
			log('New SSE connection request:', event.params.uuid);
			const session = event.locals.session;
			session.update({ tabs: session.data.tabs + 1 });
			const uuid = event.params.uuid;
			const url = event.url.searchParams.get('url') || '';

			const stream = new ReadableStream<string>({
				start(controller) {
					const connection = new Connection(uuid, session.id, controller, url, me);
					me.connections.set(uuid, connection);
					me.emitter.emit('connect', connection);
					connection.on('state-change', (con) => {
						me.emitter.emit('state-change', con);
					});
				},
				cancel() {
					const connection = me.connections.get(uuid);
					if (connection) {
						connection.closeConnection();
						me.removeConnection(connection);
					}
				}
			});

			return new Response(stream, {
				headers: {
					'Cache-Control': 'no-cache',
					'Content-Type': 'text/event-stream',
					Connection: 'keep-alive',
					'X-Accel-Buffering': 'no'
				}
			});
		});
	}

	/**
	 * Removes a connection from the active connections map
	 * Decrements session tab count and emits disconnect event
	 * @param connection - Connection to remove
	 */
	private removeConnection(connection: Connection) {
		log('Removing SSE connection:', connection.uuid);
		if (this.connections.has(connection.uuid)) {
			this.connections.delete(connection.uuid);
			this.emitter.emit('disconnect', connection);

			connection
				.getSession()
				.then((sessionResult) => {
					if (sessionResult.isOk()) {
						const session = sessionResult.value;
						if (session) {
							session.update({ tabs: Math.max(0, session.data.tabs - 1) });
						}
					}
				})
				.catch((err) => {
					console.warn('Failed to update session tab count on disconnect:', err);
				});
		}
	}

	/**
	 * Sends an event to all active connections with optional filtering
	 * Automatically removes failed or disconnected connections
	 * @param event - Event name/type to send
	 * @param data - Event payload data
	 * @param condition - Optional filter function to determine which connections receive the message
	 */
	send(event: string, data: unknown, condition?: (conn: Connection) => boolean | Promise<boolean>) {
		log(`Sending event "${event}" to connections${condition ? ' with condition' : ''}.`);
		// Create a copy of connections to avoid issues if map changes during iteration
		const connectionsCopy = [...this.connections.values()];

		for (const conn of connectionsCopy) {
			// Check if connection is still valid
			if (!conn.connected) {
				log(`Removing disconnected connection: ${conn.uuid}`);
				this.removeConnection(conn);
				continue;
			}

			if (condition && !condition(conn)) continue;

			const result = conn.send(event, data);
			if (result.isErr()) {
				log(`Failed to send to connection ${conn.uuid}:`, result.error);
				this.removeConnection(conn);
			}
		}
	}

	/**
	 * Sends a notification to all active connections with optional filtering
	 * @param notification - Notification object to send
	 * @param condition - Optional filter function to determine which connections receive the notification
	 */
	notify(notification: Notification, condition?: (conn: Connection) => boolean | Promise<boolean>) {
		this.send('notification', notification, condition);
	}

	/**
	 * Executes a callback for each active connection
	 * @param callback - Function to call for each connection
	 */
	each(callback: (conn: Connection) => void) {
		this.connections.forEach(callback);
	}

	/**
	 * Gets all connections associated with a specific session
	 * @param sessionId - Session ID to filter by
	 * @returns ConnectionArray containing matching connections
	 */
	fromSession(sessionId: string) {
		return new ConnectionArray(
			sessionId,
			[...this.connections.values()].filter((conn) => conn.sessionId === sessionId)
		);
	}

	/**
	 * Retrieves a specific connection by UUID
	 * @param uuid - Unique identifier of the connection
	 * @returns Connection instance or undefined if not found
	 */
	getConnection(uuid: string) {
		return this.connections.get(uuid);
	}

	/**
	 * Updates the last ping time for a connection
	 * Called when a ping is received from the client
	 * @param uuid - UUID of the connection that sent the ping
	 */
	receivePing(uuid: string) {
		const conn = this.connections.get(uuid);
		if (conn) conn.lastPing = Date.now();
	}

	/**
	 * Get connection statistics for monitoring memory usage and performance
	 * @returns Object containing connection metrics and memory estimates
	 */
	getStats() {
		const connections = this.connections.size;
		let totalCacheSize = 0;
		let totalCachedMessages = 0;
		let oldestConnection = Date.now();
		let newestConnection = 0;

		for (const conn of this.connections.values()) {
			const cache = conn['cache']; // Access private cache property
			totalCachedMessages += cache.length;

			// Estimate memory per cached message (JSON + metadata)
			for (const msg of cache) {
				const msgSize = JSON.stringify({ event: msg.event, data: msg.data, id: msg.id }).length;
				totalCacheSize += msgSize + 64; // Add overhead for timestamp, retries, etc.
			}

			oldestConnection = Math.min(oldestConnection, conn.lastPing);
			newestConnection = Math.max(newestConnection, conn.lastPing);
		}

		// Rough estimate of base memory per connection (not counting cache)
		const baseMemoryPerConnection = 1024; // ~1KB for connection object, event listeners, etc.
		const estimatedMemoryBytes = connections * baseMemoryPerConnection + totalCacheSize;

		return {
			activeConnections: connections,
			totalCachedMessages,
			oldestConnectionAge: connections > 0 ? Date.now() - oldestConnection : 0,
			newestConnectionAge: connections > 0 ? Date.now() - newestConnection : 0,
			avgMessagesPerConnection: connections > 0 ? Math.round(totalCachedMessages / connections) : 0,
			estimatedMemoryBytes,
			memoryEstimate: toByteString(estimatedMemoryBytes)
		};
	}

	/**
	 * Force cleanup of stale connections (for manual intervention)
	 * Useful for debugging memory issues or clearing stuck connections
	 * @param maxAge - Maximum age in milliseconds before considering a connection stale
	 * @returns Number of connections that were cleaned up
	 */
	forceCleanup(maxAge: number = DISCONNECT_TIMEOUT) {
		const now = Date.now();
		let cleaned = 0;

		for (const conn of this.connections.values()) {
			if (now - conn.lastPing > maxAge || !conn.connected) {
				console.log(`Force closing stale connection: ${conn.uuid}`);
				conn.closeConnection();
				cleaned++;
			}
		}

		return cleaned;
	}
}

/** Global SSE service instance */
export const sse = new SSE();
