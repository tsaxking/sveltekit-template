import { EventEmitter } from 'ts-utils';
import { Session } from '../structs/session';
import { Connection, sse } from './sse';

export class SessionManager {
	public static readonly managers: Map<string, SessionManager> = new Map();

	private readonly em = new EventEmitter<{
		'session-added': string;
		'session-removed': string;
		connect: Connection;
		disconnect: Connection;
		'state-change': Connection;
	}>();

	public readonly on = this.em.on.bind(this.em);
	public readonly off = this.em.off.bind(this.em);
	public emit = this.em.emit.bind(this.em);

	constructor(
		public readonly id: string,
		public readonly owner: Connection,
		public readonly sessions: string[],
		public readonly config: {
			lifetime: number;
		}
	) {}

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

	getConnections() {
		return this.sessions.map((s) => sse.fromSession(s));
	}

	addSession(session: Session.SessionData) {
		this.sessions.push(session.id);
		this.emit('session-added', session.id);
	}

	removeSession(sessionId: string) {
		const index = this.sessions.findIndex((s) => s === sessionId);
		if (index !== -1) {
			const [removed] = this.sessions.splice(index, 1);
			this.emit('session-removed', removed);
		}
	}

	send(event: string, data: unknown) {
		for (const con of this.getConnections()) {
			con.send(event, data);
		}
	}

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
