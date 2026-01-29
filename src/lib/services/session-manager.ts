/**
 * @fileoverview Client-side session manager for SSE connections.
 *
 * Wraps remote session manager APIs and exposes writable connection lists
 * for UI state.
 *
 * @example
 * import { SessionManager } from '$lib/services/session-manager';
 * const manager = new SessionManager();
 * await manager.start();
 */
import {
	closeManager,
	startManager,
	managerSend,
	getManagerConnections,
	redirectConnection,
	reloadConnection,
	sendToConnection,
	getActiveConnections
} from '$lib/remotes/session-manager.remote';
import { attemptAsync, sleep } from 'ts-utils';
import { sse } from './sse';
import z from 'zod';
import { WritableArray, WritableBase } from '$lib/services/writables';
import { ConnectionStateSchema, type ConnectionState } from '$lib/types/sse';

/**
 * Connection payload shape.
 *
 * @property {string} url - Full URL of the connection.
 * @property {string} id - Connection UUID.
 * @property {string} sessionId - Session ID.
 * @property {string | null} generalizedUrl - Generalized URL pattern.
 * @property {ConnectionState} [state] - Optional connection state.
 */
type ConnectionData = {
	url: string;
	id: string;
	sessionId: string;
	generalizedUrl: string | null;
	state?: ConnectionState;
};

/**
 * Writable connection wrapper with remote actions.
 *
 * @property {string} id - Connection UUID.
 * @property {string} sessionId - Session ID.
 * @property {string} url - Current URL.
 * @property {string | null} generalizedUrl - Generalized URL.
 * @property {boolean} self - Whether the connection is the current client.
 */
export class Connection extends WritableBase<ConnectionData> {
	constructor(data: ConnectionData) {
		super(data);
	}

	/**
	 * Connection UUID.
	 */
	get id() {
		return this.data.id;
	}

	/**
	 * Owning session ID.
	 */
	get sessionId() {
		return this.data.sessionId;
	}

	/**
	 * Full URL for the connection.
	 */
	get url() {
		return this.data.url;
	}

	/**
	 * Generalized URL pattern, if available.
	 */
	get generalizedUrl() {
		return this.data.generalizedUrl;
	}

	/**
	 * Whether this connection represents the current client.
	 */
	get self() {
		return this.id === sse.uuid;
	}

	/**
	 * Redirects the connection to a new URL.
	 *
	 * @param {string} url - Target URL.
	 * @param {string} [reason] - Optional reason message.
	 */
	redirect(url: string, reason?: string) {
		return attemptAsync(async () => {
			return redirectConnection({
				url,
				reason,
				id: this.id
			});
		});
	}

	/**
	 * Reloads the connection.
	 *
	 * @param {string} [reason] - Optional reason message.
	 */
	reload(reason?: string) {
		return attemptAsync(async () => {
			return reloadConnection({
				id: this.id,
				reason
			});
		});
	}

	/**
	 * Sends a custom event to the connection.
	 *
	 * @param {string} event - SSE event name.
	 * @param {unknown} data - Payload.
	 */
	send(event: string, data: unknown) {
		return attemptAsync(async () => {
			return sendToConnection({
				id: this.id,
				event,
				data
			});
		});
	}
}

/**
 * Client-side session manager wrapper.
 *
 * @property {Map<string, SessionManager>} managers - Active managers by ID.
 * @property {WritableArray<Connection>} connections - Global connections list.
 */
export class SessionManager extends WritableArray<Connection> {
	public static readonly managers = new Map<string, SessionManager>();
	public static readonly connections = new WritableArray<Connection>([]);

	/**
	 * Loads existing active connections into the global list.
	 */
	public static init() {
		return attemptAsync(async () => {
			const connections = await getActiveConnections();
			for (const con of connections) {
				const connection = new Connection(con);
				SessionManager.connections.push(connection);
			}
		});
	}

	public readonly state = new WritableBase<'Connecting...' | 'Connected' | 'Disconnected'>(
		'Disconnected'
	);

	/**
	 * Current manager ID.
	 */
	public id: string | null = null;

	constructor() {
		super([]);
	}

	/**
	 * Starts the remote session manager with retry/backoff.
	 */
	start() {
		return attemptAsync(async () => {
			this.state.set('Connecting...');
			const tryStart = async () => {
				this.id = await startManager();
				SessionManager.managers.set(this.id!, this);
				this.set(await this.getConnections().unwrap());
				this.state.set('Connected');
			};
			let delay = 1000;
			const maxDelay = 30000;

			while (true) {
				try {
					await tryStart();
					break;
				} catch (error) {
					console.error(
						'Failed to start session manager, retrying in',
						delay / 1000,
						'seconds:',
						error
					);
					await sleep(delay);
					delay = Math.min(delay * 2, maxDelay);
					if (delay === maxDelay) {
						this.state.set('Disconnected');
						throw new Error('Failed to start session manager after multiple attempts.');
					}
				}
			}
		});
	}

	/**
	 * Closes the remote session manager.
	 */
	close() {
		return attemptAsync(async () => {
			if (!this.id) throw new Error('SessionManager not started.');
			await closeManager(this.id);
			this.id = null;
		});
	}

	/**
	 * Sends a message to all connections managed by this manager.
	 *
	 * @param {string} event - Event name.
	 * @param {unknown} data - Payload.
	 */
	send(event: string, data: unknown) {
		return attemptAsync(async () => {
			if (!this.id) throw new Error('SessionManager not started.');
			return managerSend({
				manager: this.id,
				event,
				data
			});
		});
	}

	/**
	 * Fetches all connections associated with this manager.
	 */
	getConnections() {
		return attemptAsync(async () => {
			if (!this.id) throw new Error('SessionManager not started.');
			const connections = await getManagerConnections(this.id);

			return connections.map((c) => c.map((con) => new Connection(con))).flat();
		});
	}

	/**
	 * Adds a connection to the manager's list.
	 *
	 * @param {Connection} data - Connection to add.
	 */
	addConnection(data: Connection) {
		if (this.data.find((c) => c.id === data.id)) return;
		this.data.push(data);
		this.inform();
	}

	/**
	 * Removes a connection from the manager's list.
	 *
	 * @param {string} connectionId - Connection ID to remove.
	 */
	removeConnection(connectionId: string) {
		const index = this.data.findIndex((c) => c.id === connectionId);
		if (index !== -1) {
			this.data.splice(index, 1);
			this.inform();
		}
	}

	/**
	 * Checks whether a session ID is managed.
	 *
	 * @param {string} sessionId - Session ID to check.
	 */
	hasSession(sessionId: string) {
		return this.data.some((c) => c.sessionId === sessionId);
	}
}

sse.on('session-manager:connection-connect', (data) => {
	const parsed = z
		.object({
			sessionId: z.string(),
			id: z.string(),
			url: z.string(),
			generalizedUrl: z.string().nullable()
		})
		.safeParse(data);

	if (!parsed.success)
		return console.error('Invalid session-manager:connection-connect data:', parsed.error);

	const connection = new Connection({
		id: parsed.data.id,
		sessionId: parsed.data.sessionId,
		url: parsed.data.url,
		generalizedUrl: parsed.data.generalizedUrl
	});

	SessionManager.connections.push(connection);

	for (const manager of SessionManager.managers.values()) {
		if (manager.hasSession(parsed.data.sessionId)) {
			manager.addConnection(connection);
		}
	}
});

sse.on('session-manager:connection-disconnect', (data) => {
	const parsed = z
		.object({
			sessionId: z.string(),
			id: z.string()
		})
		.safeParse(data);

	if (!parsed.success)
		return console.error('Invalid session-manager:connection-disconnect data:', parsed.error);

	for (const manager of SessionManager.managers.values()) {
		manager.removeConnection(parsed.data.id);
	}

	SessionManager.connections.remove((item) => item.id === parsed.data.id);
});

sse.on('session-manager:closed', (data) => {
	const parsed = z
		.object({
			managerId: z.string()
		})
		.safeParse(data);

	if (!parsed.success) return console.error('Invalid session-manager:closed data:', parsed.error);

	SessionManager.managers.delete(parsed.data.managerId);
});

sse.on('session-manager:connection-state-change', (data) => {
	const parsed = z
		.object({
			id: z.string(),
			state: ConnectionStateSchema
		})
		.safeParse(data);

	if (!parsed.success)
		return console.error('Invalid session-manager:connection-state-change data:', parsed.error);

	const connection = SessionManager.connections.data.find((c) => c.id === parsed.data.id);
	if (!connection) return;

	connection.update((data) => ({
		...data,
		state: parsed.data.state
	}));
});
