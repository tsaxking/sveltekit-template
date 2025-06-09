import { attempt, attemptAsync } from 'ts-utils/check';
import type { RequestEvent as ConnectRequestEvent } from '../../../routes/sse/init/[uuid]/$types';
import { Session } from '../structs/session';
import { encode } from 'ts-utils/text';
import { EventEmitter, SimpleEventEmitter } from 'ts-utils/event-emitter';
import type { Notification } from '$lib/types/notification';
import { Struct, type Blank, StructData } from 'drizzle-struct/back-end';
import { Account } from '../structs/account';
import { Permissions } from '../structs/permissions';
import { PropertyAction } from 'drizzle-struct/types';

type Stream = ReadableStreamDefaultController<string>;

class ConnectionArray {
	constructor(private readonly connections: Connection[] = []) {}

	add(connection: Connection) {
		this.connections.push(connection);
	}

	remove(connection: Connection) {
		this.connections.splice(this.connections.indexOf(connection), 1);
	}

	each(callback: (connection: Connection) => void) {
		return this.connections.map(callback);
	}

	send(event: string, data: unknown) {
		return this.each((connection) => connection.send(event, data));
	}
	notify(notif: Notification) {
		return this.send('notification', notif);
	}
}

export class Connection {
	public readonly sessionId: string;

	private readonly emitter = new SimpleEventEmitter<'connect' | 'destroy' | 'close'>();

	private index = 0;
	// private interval: NodeJS.Timeout;

	private cache: {
		event: string;
		data: unknown;
		id: number;
		date: number;
		retries: number;
	}[] = [];

	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind(this.emitter); // ✅ Fixed `.once` binding
	private emit = this.emitter.emit.bind(this.emitter);

	constructor(
		public readonly uuid: string,
		session: Session.SessionData,
		public readonly sse: SSE,
		private readonly controller: Stream
	) {
		this.sessionId = session.id;

		// this.interval = setInterval(() => {
		// 	const now = Date.now();

		// 	// Send heartbeat ping
		// 	this.send('ping', null);

		// 	// Check for unacked ping > 20s old
		// 	const pings = this.cache.filter(e => e.event === 'ping');
		// 	const lastPing = pings.length > 0 ? pings[pings.length - 1] : null;
		// 	if (lastPing && now - lastPing.date > 20000) {
		// 		clearInterval(this.interval);
		// 		this.close();
		// 		return;
		// 	}

		// 	// Retry unacked messages (max 5 retries within 30s)
		// 	for (const msg of this.cache) {
		// 		if (now - msg.date > 30000 || msg.retries >= 5) continue;
		// 		this.controller.enqueue(
		// 			`data: ${encode(JSON.stringify({ event: msg.event, data: msg.data, id: msg.id }))}\n\n`
		// 		);
		// 		msg.retries++;
		// 	}

		// 	this.cache = this.cache.filter(
		// 		(e) => now - e.date < 30000 && e.id > this.index - 20
		// 	);
		// }, 10000);
	}

	send(event: string, data: unknown) {
		return attempt(() => {
			const id = this.index++;
			this.controller.enqueue(`data: ${encode(JSON.stringify({ event, data, id }))}\n\n`);
			this.cache.push({ event, data, id, date: Date.now(), retries: 0 });
			return id;
		});
	}

	ack(id: number) {
		this.cache = this.cache.filter((e) => e.id > id);
	}

	close() {
		return attempt(() => {
			console.log('Closing connection', this.uuid);
			// clearInterval(this.interval);
			// this.send('close', null);
			this.emit('close');
			this.controller.close();
			this.sse.connections.delete(this.uuid);
		});
	}

	getSession() {
		return Session.Session.fromId(this.sessionId);
	}

	notify(notif: Notification) {
		return this.send('notification', notif);
	}

	isAlive() {
		return this.cache.some((e) => e.event === 'ping' && Date.now() - e.date < 20000);
	}

	retryCached(now: number) {
		for (const msg of this.cache) {
			if (now - msg.date > 30000 || msg.retries >= 5) continue;
			this.controller.enqueue(
				`data: ${encode(JSON.stringify({ event: msg.event, data: msg.data, id: msg.id }))}\n\n`
			);
			msg.retries++;
		}

		this.cache = this.cache.filter((e) => now - e.date < 30000 && e.id > this.index - 20);
	}
}

type Events = {
	connect: Connection;
	disconnect: Connection;
};

export class SSE {
	public readonly connections = new Map<string, Connection>();

	private readonly emitter = new EventEmitter<Events>();

	public readonly on = this.emitter.on.bind(this.emitter);
	public readonly off = this.emitter.off.bind(this.emitter);
	public readonly once = this.emitter.once.bind(this.emitter);
	private readonly emit = this.emitter.emit.bind(this.emitter);

	constructor() {
		process.on('exit', () => {
			this.each((c) => c.close());
		});
		setInterval(() => {
			const now = Date.now();
			this.connections.forEach((connection) => {
				if (!connection.isAlive()) {
					connection.close();
					return;
				}

				// Send ping and retry unacked messages
				connection.send('ping', null);
				connection.retryCached(now);
			});
		}, 10000);
	}

	connect(event: ConnectRequestEvent) {
		const me = this;
		return attemptAsync(async () => {
			const session = event.locals.session;
			let connection: Connection;

			const stream = new ReadableStream({
				async start(controller) {
					// const ssid = event.cookies.get('ssid');
					// if (!ssid) return;
					connection = me.addConnection(controller, event.params.uuid, session);
					me.emit('connect', connection);
				},
				cancel() {
					try {
						if (connection) {
							me.emit('disconnect', connection);
							connection.close();
						}
					} catch (error) {
						console.error(error);
					}
				}
			});

			return new Response(stream, {
				headers: {
					'Cache-Control': 'no-store',
					'Content-Type': 'text/event-stream',
					Connection: 'keep-alive'
				}
			});
		});
	}

	send(
		event: string,
		data: unknown,
		condition?: (connection: Connection) => boolean | Promise<boolean>
	) {
		this.connections.forEach((connection) => {
			if (condition && !condition(connection)) return;
			connection.send(event, data);
		});
	}

	each(callback: (connection: Connection) => void) {
		this.connections.forEach(callback);
	}

	fromSession(sessionId: string) {
		return new ConnectionArray(
			[...this.connections.values()].filter((connection) => connection.sessionId === sessionId)
		);
	}

	addConnection(controller: Stream, uuid: string, session: Session.SessionData) {
		if (this.connections.has(uuid)) {
			this.connections.delete(uuid);
			// this.connections.get(ssid)?.addController(controller);
		}

		const connection = new Connection(uuid, session, this, controller);
		// connection.addController(controller);
		this.connections.set(uuid, connection);
		return connection;
	}

	getConnection(uuid: string) {
		return this.connections.get(uuid);
	}
}

export const sse = new SSE();

export const createStructService = (struct: Struct<Blank, string>) => {
	if (struct.data.frontend === false) return;
	// Permission handling
	const emitToConnections = async (
		event: string,
		data: StructData<typeof struct.data.structure, typeof struct.data.name>
	) => {
		// console.log(sse);
		sse.each(async (connection) => {
			if (struct.name === 'test') {
				// terminal.log('Emitting: ', data.data);
				connection.send(`struct:${struct.name}`, {
					event,
					data: data.data
				});
				return;
			}
			const session = await connection.getSession();
			if (session.isErr()) return console.error(session.error);
			const s = session.value;
			if (!s) return;

			const account = await Session.getAccount(s);
			if (account.isErr()) return console.error(account.error);
			const a = account.value;
			if (!a) return;

			if ((await Account.isAdmin(account.value)).unwrap()) {
				connection.send(`struct:${struct.name}`, {
					event,
					data: data.safe()
				});
				return;
			}

			const res = await Permissions.filterPropertyActionFromAccount(a, [data], PropertyAction.Read);
			if (res.isErr()) return console.error(res.error);
			const [result] = res.value;
			connection.send(`struct:${struct.name}`, {
				event,
				data: result
			});
		});
	};

	if (!struct.frontend) return;

	struct.on('create', (data) => {
		emitToConnections('create', data);
	});

	struct.on('update', (data) => {
		emitToConnections('update', data.to);
	});

	struct.on('archive', (data) => {
		emitToConnections('archive', data);
	});

	struct.on('delete', (data) => {
		emitToConnections('delete', data);
	});

	struct.on('restore', (data) => {
		emitToConnections('restore', data);
	});

	struct.emit('build');
};
