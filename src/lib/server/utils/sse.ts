import { attempt, attemptAsync } from 'ts-utils/check';
import type { RequestEvent } from '../../../routes/sse/$types';
import { Session } from '../structs/session';
import { encode } from 'ts-utils/text';
import { EventEmitter, SimpleEventEmitter } from 'ts-utils/event-emitter';
import type { Notification } from '$lib/types/notification';
import terminal from './terminal';
import type { Account } from '../structs/account';

type Stream = ReadableStreamDefaultController<string>;

export class Connection {
	private readonly controllers = new Set<Stream>();
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
		public readonly ssid: string,
		session: Session.SessionData | undefined,
		public readonly sse: SSE
	) {
		this.sessionId = ssid;

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
			this.controllers.forEach((c) =>
				c.enqueue(`data: ${encode(JSON.stringify({ event, data, id: this.index++ }))}\n\n`)
			);
			this.cache.push({ event, data, id: this.index, date: Date.now() });
			return this.index;
		});
	}

	close() {
		return attempt(() => {
			// clearInterval(this.interval);
			this.send('close', null);
			this.emit('close');
			this.controllers.forEach((c) => c.close());
			this.sse.connections.delete(this.ssid);
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

	addController(controller: Stream) {
		this.controllers.add(controller);
	}
}

type Events = {
	connect: Connection;
	disconnect: Connection;
};

class SSE {
	public readonly connections = new Map<string, Connection>();

	private readonly emitter = new EventEmitter<Events>();

	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind(this.emitter);
	private emit = this.emitter.emit.bind(this.emitter);

	constructor() {
		process.on('exit', () => {
			this.each((c) => c.close());
		});
	}

	connect(
		event: RequestEvent & {
			locals: {
				session: Session.SessionData;
				account?: Account.AccountData;
			};
		}
	) {
		const me = this;
		return attemptAsync(async () => {
			const session = event.locals.session;
			let connection: Connection;

			const stream = new ReadableStream({
				async start(controller) {
					const ssid = event.cookies.get('ssid');
					if (!ssid) return;
					connection = me.addConnection(controller, ssid, session);
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
		return [...this.connections.values()].find((connection) => connection.sessionId === sessionId);
	}

	addConnection(controller: Stream, ssid: string, session?: Session.SessionData) {
		if (this.connections.has(ssid)) {
			this.connections.get(ssid)?.addController(controller);
		}

		const connection = new Connection(ssid, session, this);
		connection.addController(controller);
		this.connections.set(ssid, connection);
		return connection;
	}

	getConnection(event: {
		cookies: {
			get: (key: string) => string | undefined;
		};
	}) {
		const tabId = event.cookies.get('ssid');
		if (!tabId) return undefined;
		return this.connections.get(tabId);
	}
}

export const sse = new SSE();
