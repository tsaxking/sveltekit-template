/**
 * @fileoverview Manages session groups and broadcasts connection lifecycle events.
 *
 * A `SessionManager` tracks a set of session IDs and forwards SSE connection
 * events to an owner connection. It also exposes an event emitter so callers
 * can react to session membership changes.
 *
 * @example
 * import { SessionManager } from '$lib/server/services/session-manager';
 * const manager = new SessionManager('group-1', owner, [owner.sessionId], {
 *   lifetime: 60_000
 * });
 * manager.init();
 */
import { EventEmitter } from 'ts-utils';
import { Session } from '../structs/session';
import { Connection, sse } from './sse';

/**
 * Tracks a group of sessions and emits SSE connection events.
 *
 * @property {string} id - Unique manager identifier.
 * @property {Connection} owner - SSE connection that receives updates.
 * @property {string[]} sessions - Session IDs included in the group.
 * @property {{ lifetime: number }} config - Manager configuration.
 * @property {number} config.lifetime - Milliseconds until the manager closes itself.
 */
export class SessionManager {
	public static readonly managers: Map<string, SessionManager> = new Map();

	private readonly em = new EventEmitter<{
		'session-added': string;
		'session-removed': string;
		connect: Connection;
		disconnect: Connection;
		'state-change': Connection;
	}>();

	/** Registers a listener for session events. */
	public readonly on = this.em.on.bind(this.em);
	/** Removes a previously registered listener. */
	public readonly off = this.em.off.bind(this.em);
	/** Emits a session manager event. */
	public emit = this.em.emit.bind(this.em);

	/**
	 * Creates a new manager for a set of session IDs.
	 *
	 * @param {string} id - Manager identifier.
	 * @param {Connection} owner - Owning connection receiving updates.
	 * @param {string[]} sessions - Initial session IDs to track.
	 * @param {{ lifetime: number }} config - Lifetime configuration.
	 */
	constructor(
		public readonly id: string,
		public readonly owner: Connection,
		public readonly sessions: string[],
		public readonly config: {
			lifetime: number;
		}
	) {}

	/**
	 * Initializes manager state and hooks SSE lifecycle listeners.
	 */
	init() {
		SessionManager.managers.set(this.id, this);
		const offs: (() => void)[] = [];

		offs.push(
			this.on('connect', (connection) => {
				if (connection.sessionId === this.owner.sessionId) return;
				this.owner.send('session-manager:connection-connect', {
					id: connection.uuid,
					sessionId: connection.sessionId,
					url: connection.url,
					generalizedUrl: connection.generalizedUrl
				});
			})
		);

		offs.push(
			this.on('disconnect', (connection) => {
				if (connection.sessionId === this.owner.sessionId) return;
				this.owner.send('session-manager:connection-disconnect', {
					id: connection.uuid,
					sessionId: connection.sessionId
				});
			})
		);

		const onclose = () => {
			this.delete();
			for (const off of offs) off();
			clearTimeout(timeout);
		};

		this.owner.once('close', onclose);

		const timeout = setTimeout(onclose, this.config.lifetime);
	}

	/**
	 * Returns SSE connections for all tracked sessions.
	 */
	getConnections() {
		return this.sessions.map((s) => sse.fromSession(s));
	}

	/**
	 * Adds a session to this manager.
	 *
	 * @param {Session.SessionData} session - Session to add.
	 */
	addSession(session: Session.SessionData) {
		this.sessions.push(session.id);
		this.emit('session-added', session.id);
	}

	/**
	 * Removes a session from this manager.
	 *
	 * @param {string} sessionId - Session ID to remove.
	 */
	removeSession(sessionId: string) {
		const index = this.sessions.findIndex((s) => s === sessionId);
		if (index !== -1) {
			const [removed] = this.sessions.splice(index, 1);
			this.emit('session-removed', removed);
		}
	}

	/**
	 * Sends a message to all connections associated with the manager.
	 *
	 * @param {string} event - SSE event name.
	 * @param {unknown} data - Payload to send.
	 */
	send(event: string, data: unknown) {
		for (const con of this.getConnections()) {
			con.send(event, data);
		}
	}

	/**
	 * Closes the manager, clears sessions, and notifies the owner.
	 */
	delete() {
		this.sessions.length = 0;
		SessionManager.managers.delete(this.id);
		this.owner.send('session-manager:closed', { managerId: this.id });
	}
}

sse.on('connect', (connection) => {
	for (const m of SessionManager.managers.values()) {
		if (m.sessions.find((s) => s === connection.sessionId)) {
			m.emit('connect', connection);
		}
		m.owner.send('session-manager:connection-connect', {
			id: connection.uuid,
			sessionId: connection.sessionId,
			url: connection.url,
			generalizedUrl: connection.generalizedUrl
		});
	}
});

sse.on('disconnect', (connection) => {
	for (const m of SessionManager.managers.values()) {
		if (m.sessions.find((s) => s === connection.sessionId)) {
			m.emit('disconnect', connection);
		}
		m.owner.send('session-manager:connection-disconnect', {
			id: connection.uuid,
			sessionId: connection.sessionId
		});
	}
});

sse.on('state-change', (connection) => {
	for (const m of SessionManager.managers.values()) {
		if (m.sessions.find((s) => s === connection.sessionId)) {
			m.emit('state-change', connection);
		}
		m.owner.send('session-manager:connection-state-change', {
			id: connection.uuid,
			sessionId: connection.sessionId,
			state: connection.state
		});
	}
});

Session.Session.on('delete', (session) => {
	for (const m of SessionManager.managers.values()) {
		if (m.sessions.find((s) => s === session.data.id)) {
			m.removeSession(session.data.id);
		}
	}
});
