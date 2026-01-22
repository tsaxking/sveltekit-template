import {
	closeManager,
	startManager,
	managerSend,
	getManagerConnections,
	redirectConnection,
	reloadConnection,
	sendToConnection,
	getActiveConnections
} from '$lib/utils/remote/session-manager.remote';
import { attemptAsync, sleep } from 'ts-utils';
import { sse } from './sse';
import z from 'zod';
import { WritableArray, WritableBase } from '$lib/utils/writables';
import { ConnectionStateSchema, type ConnectionState } from '$lib/types/sse';

type ConnectionData = {
	url: string;
	id: string;
	sessionId: string;
	generalizedUrl: string | null;
	state?: ConnectionState;
};

export class Connection extends WritableBase<ConnectionData> {
	constructor(data: ConnectionData) {
		super(data);
	}

	get id() {
		return this.data.id;
	}

	get sessionId() {
		return this.data.sessionId;
	}

	get url() {
		return this.data.url;
	}

	get generalizedUrl() {
		return this.data.generalizedUrl;
	}

	get self() {
		return this.id === sse.uuid;
	}

	redirect(url: string, reason?: string) {
		return attemptAsync(async () => {
			return redirectConnection({
				url,
				reason,
				id: this.id
			});
		});
	}

	reload(reason?: string) {
		return attemptAsync(async () => {
			return reloadConnection({
				id: this.id,
				reason
			});
		});
	}

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

export class SessionManager extends WritableArray<Connection> {
	public static readonly managers = new Map<string, SessionManager>();
	public static readonly connections = new WritableArray<Connection>([]);

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

	public id: string | null = null;

	constructor() {
		super([]);
	}

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

	close() {
		return attemptAsync(async () => {
			if (!this.id) throw new Error('SessionManager not started.');
			await closeManager(this.id);
			this.id = null;
		});
	}

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

	getConnections() {
		return attemptAsync(async () => {
			if (!this.id) throw new Error('SessionManager not started.');
			const connections = await getManagerConnections(this.id);

			return connections.map((c) => c.map((con) => new Connection(con))).flat();
		});
	}

	addConnection(data: Connection) {
		if (this.data.find((c) => c.id === data.id)) return;
		this.data.push(data);
		this.inform();
	}

	removeConnection(connectionId: string) {
		const index = this.data.findIndex((c) => c.id === connectionId);
		if (index !== -1) {
			this.data.splice(index, 1);
			this.inform();
		}
	}

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
