import { attempt, attemptAsync } from 'ts-utils/check';
import type { RequestEvent as ConnectRequestEvent } from '../../../routes/sse/init/[uuid]/$types';
import { Session } from '../structs/session';
import { encode } from 'ts-utils/text';
import { EventEmitter, SimpleEventEmitter } from 'ts-utils/event-emitter';
import type { Notification } from '$lib/types/notification';

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

	private index = -1;
	// private readonly interval: NodeJS.Timeout;

	private cache: {
		event: string;
		data: unknown;
		id: number;
		date: number;
	}[] = [];

	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind;
	private emit = this.emitter.emit.bind(this.emitter);

	constructor(
		public readonly uuid: string,
		session: Session.SessionData,
		public readonly sse: SSE,
		private readonly controller: Stream
	) {
		this.sessionId = session.id;

		// this.interval = setInterval(() => {
		// 	this.send('ping', null).unwrap();

		// 	const now = Date.now();
		// 	const cache = this.cache.filter((e) => now - e.date < 10000);
		// 	for (const { event, data, date } of cache) {
		// 		// if it has not acknoledged a ping after 20 seconds, the connection is dead
		// 		// if (now - date > 20000 && event === 'ping') {
		// 		// 	clearInterval(this.interval);
		// 		// 	return this.close();
		// 		// }
		// 		this.send(event, data);
		// 	}
		// }, 10000);
	}

	send(event: string, data: unknown) {
		return attempt(() => {
			// terminal.log('Sending', event, data);
			// this.controllers.forEach((c) =>
			this.controller.enqueue(
				`data: ${encode(JSON.stringify({ event, data, id: this.index++ }))}\n\n`
			);
			// );
			this.cache.push({ event, data, id: this.index, date: Date.now() });
			return this.index;
		});
	}

	close() {
		return attempt(() => {
			console.log('Closing connection', this.uuid);
			// clearInterval(this.interval);
			this.send('close', null);
			this.emit('close');
			// this.controllers.forEach((c) => c.close());
			this.controller.close();
			this.sse.connections.delete(this.uuid);
		});
	}

	getSession() {
		return Session.Session.fromId(this.sessionId);
	}

	ack(id: number) {
		this.cache = this.cache.filter((e) => e.id > id);
	}

	notify(notif: Notification) {
		return this.send('notification', notif);
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
