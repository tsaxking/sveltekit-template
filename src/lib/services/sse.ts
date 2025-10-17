import { browser } from '$app/environment';
import { EventEmitter } from 'ts-utils/event-emitter';
import { decode } from 'ts-utils/text';
import { notify } from '../utils/prompts';
import { z } from 'zod';
import { Requests } from '../utils/requests';
import { Random } from 'ts-utils/math';

/**
 * Client-side Server-Sent Events (SSE) manager for real-time communication with the server.
 * Handles connection establishment, automatic reconnection, message parsing, and user activity tracking.
 *
 * @example Basic usage
 * ```typescript
 * // Listen for custom events
 * sse.on('user-update', (userData) => {
 *   console.log('User updated:', userData);
 * });
 *
 * // Wait for connection before sending requests
 * await sse.waitForConnection(5000);
 *
 * // Check connection quality
 * console.log(`Average latency: ${sse.latency}ms`);
 * ```
 *
 * Features:
 * - Automatic connection management with exponential backoff
 * - User activity monitoring (disconnects during inactivity)
 * - Page visibility handling (reconnects when tab becomes active)
 * - Latency measurement and monitoring
 * - Built-in notification handling
 * - Message acknowledgment system
 * - Graceful error handling and recovery
 */
class SSE {
	/** Unique identifier for this client connection */
	public readonly uuid = Random.uuid();

	/** Event emitter for handling SSE events */
	private readonly emitter = new EventEmitter();

	/** Array storing recent latency measurements */
	private _latency: number[] = [];

	/** ID of the last acknowledged message */
	private lastAckedId = 0;

	/** Flag indicating if connection is intentionally disconnected */
	private isDisconnected = false;

	/** Flag indicating if reconnection is in progress */
	private isReconnecting = false;

	/** Function to close the current connection */
	private disconnect: () => void = () => {};

	/** Current reconnection attempt number for exponential backoff */
	private reconnectAttempt = 0;

	/** Maximum backoff time in milliseconds */
	private readonly maxBackoff = 30000;

	/** Number of consecutive ping failures */
	private pingFailures = 0;

	/** Event listener methods */
	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind(this.emitter);

	/**
	 * Initializes the SSE connection and sets up user activity monitoring
	 * @param enable - Whether to enable SSE (typically based on browser environment)
	 */
	init(enable: boolean) {
		if (!enable) return;
		this.connect();

		// User activity events that indicate the user is active
		const userActivityEvents = ['mousedown', 'mouseover', 'touchstart', 'scroll'];
		let inactivityTimeout: ReturnType<typeof setTimeout>;

		/**
		 * Resets the inactivity timer and reconnects if needed
		 * Disconnects after 5 minutes of inactivity to save resources
		 */
		const resetInactivityTimer = () => {
			if (inactivityTimeout) clearTimeout(inactivityTimeout);
			inactivityTimeout = setTimeout(
				() => {
					this.disconnect();
					this.isDisconnected = true;
				},
				1000 * 60 * 5
			); // 5 mins
			if (this.isDisconnected) {
				this.isDisconnected = false;
				this.disconnect = this.connect();
			}
		};

		// Set up user activity monitoring
		userActivityEvents.forEach((event) => document.addEventListener(event, resetInactivityTimer));

		// Handle page visibility changes (tab switching)
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				// Disconnect after 1 minute if tab is hidden
				setTimeout(() => {
					if (document.hidden) {
						this.disconnect();
						this.isDisconnected = true;
					}
				}, 1000 * 60);
			} else if (this.isDisconnected) {
				// Reconnect when tab becomes visible again
				this.isDisconnected = false;
				this.disconnect = this.connect();
			}
		});
	}

	/**
	 * Establishes SSE connection with automatic reconnection logic
	 * @returns Function to close the connection
	 */
	connect() {
		/**
		 * Internal function that creates the actual EventSource connection
		 * Handles all connection logic, event parsing, and error recovery
		 */
		const establishConnection = () => {
			// Set SSE metadata for server identification
			Requests.setMeta('sse', this.uuid);
			const source = new EventSource(`/sse/init/${this.uuid}?lastAck=${this.lastAckedId}`);

			/**
			 * Handles successful connection establishment
			 * Resets reconnection counters and emits connect event
			 */
			const handleConnect = () => {
				this.emitter.emit('connect', undefined);
				this.reconnectAttempt = 0;
				this.pingFailures = 0;
			};

			/**
			 * Handles incoming SSE messages
			 * Parses messages, handles notifications, and emits events
			 */
			const handleMessage = (event: MessageEvent) => {
				try {
					const parsed = z
						.object({
							id: z.number(),
							event: z.string(),
							data: z.unknown()
						})
						.parse(JSON.parse(decode(event.data)));

					if (parsed.event === 'close') {
						source.close();
					} else if (parsed.event === 'notification') {
						// Handle server notifications
						const notifSchema = z.object({
							title: z.string(),
							message: z.string(),
							severity: z.enum(['info', 'warning', 'danger', 'success'])
						});
						const notif = notifSchema.safeParse(parsed.data);
						if (notif.success) {
							notify({
								color: notif.data.severity,
								title: notif.data.title,
								message: notif.data.message,
								autoHide: 5000
							});
						}
					} else if (parsed.event !== 'ping') {
						// Emit custom events to listeners
						this.emitter.emit(parsed.event, parsed.data);
					}

					// Acknowledge message receipt
					this.ack(parsed.id);
				} catch (err) {
					console.error('Failed to parse SSE event:', err);
				}
			};

			/**
			 * Handles connection errors and triggers reconnection
			 * Uses exponential backoff to avoid overwhelming the server
			 */
			const handleError = () => {
				console.warn('SSE connection lost, retrying...');
				source.close();
				if (!this.isReconnecting) {
					this.isReconnecting = true;
					const backoff = Math.min(1000 * 2 ** this.reconnectAttempt, this.maxBackoff);
					this.reconnectAttempt++;
					setTimeout(() => {
						this.disconnect = establishConnection();
						this.isReconnecting = false;
					}, backoff);
				}
			};

			// Register event listeners
			source.addEventListener('open', handleConnect);
			source.addEventListener('message', handleMessage);
			source.addEventListener('error', handleError);

			/**
			 * Cleanup function for closing the connection
			 * Removes all event listeners and prevents memory leaks
			 */
			const closeConnection = () => {
				source.close();
				source.removeEventListener('open', handleConnect);
				source.removeEventListener('message', handleMessage);
				source.removeEventListener('error', handleError);
				window.removeEventListener('beforeunload', closeConnection);
			};

			// Close connection when page unloads
			window.addEventListener('beforeunload', closeConnection);

			return () => closeConnection();
		};

		// Close existing connection and establish new one
		this.disconnect();
		this.disconnect = establishConnection();

		// Set up ping monitoring to detect connection issues
		const pingInterval = setInterval(async () => {
			if (this.isDisconnected) return clearInterval(pingInterval);
			const success = await this.ping();
			if (!success) {
				this.pingFailures++;
				if (this.pingFailures >= 3) {
					// Reconnect after 3 failed pings
					this.disconnect();
					this.disconnect = establishConnection();
				}
			} else {
				this.pingFailures = 0;
			}
		}, 5000);

		return this.disconnect.bind(this);
	}

	/**
	 * Acknowledges receipt of a message to the server
	 * Prevents message retransmission
	 * @param id - ID of the message to acknowledge
	 */
	private ack(id: number) {
		this.lastAckedId = id;
		fetch(`/sse/ack/${this.uuid}/${id}`);
	}

	/**
	 * Sends a ping to the server and measures latency
	 * Used for connection health monitoring
	 * @returns Promise resolving to true if ping succeeded
	 */
	private async ping() {
		const start = performance.now();
		try {
			const res = await fetch(`/sse/ping/${this.uuid}`);
			const end = performance.now();
			const latency = end - start;
			const text = await res.text();
			const [, serverLatency] = text.split(':');

			// Calculate network latency by subtracting server processing time
			if (!isNaN(+serverLatency)) {
				this._latency.push(latency - +serverLatency);
			} else {
				this._latency.push(latency);
			}

			// Keep only recent latency measurements
			if (this._latency.length > 3) this._latency.shift();
			return res.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Waits for SSE connection to be established
	 * Useful for ensuring connection before performing operations
	 * @param timeout - Maximum time to wait in milliseconds
	 * @returns Promise that resolves when connected or rejects on timeout
	 */
	public waitForConnection(timeout: number) {
		return new Promise<void>((resolve, reject) => {
			let settled = false;
			if (!this.isDisconnected) {
				return resolve();
			}
			this.once('connect', () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve();
			});
			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
				reject(new Error(`SSE connection timed out after ${timeout}ms`));
			}, timeout);
		});
	}

	/**
	 * Gets the average network latency to the server
	 * Based on recent ping measurements
	 * @returns Average latency in milliseconds
	 */
	get latency() {
		if (this._latency.length === 0) return 0;
		return this._latency.reduce((a, b) => a + b, 0) / this._latency.length;
	}
}

/** Global SSE client instance - automatically initializes in browser environment */
export const sse = new SSE();
sse.init(browser);
