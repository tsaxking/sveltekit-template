import { attempt, attemptAsync } from 'ts-utils/check';
import type { RequestEvent as ConnectRequestEvent } from '../../../routes/sse/init/[uuid]/$types';
import { Session } from '../structs/session';
import { encode } from 'ts-utils/text';
import { EventEmitter } from 'ts-utils/event-emitter';
import type { Notification } from '$lib/types/notification';

const CACHE_LIMIT = 50;
const CACHE_TTL = 30000;
const PING_INTERVAL = 10000;
const DISCONNECT_TIMEOUT = 35000;

export class Connection {
	public lastPing = Date.now();
	private cache: {
		event: string;
		data: unknown;
		id: number;
		timestamp: number;
		retries: number;
	}[] = [];
	private idCounter = 0;

	constructor(
		public readonly uuid: string,
		public readonly sessionId: string,
		private readonly controller: ReadableStreamDefaultController<string>,
		private readonly onClose: (conn: Connection) => void
	) {}

	send(event: string, data: unknown) {
		return attempt(() => {
			const id = this.idCounter++;
			const payload = JSON.stringify({ event, data, id });
			this.controller.enqueue(`data: ${encode(payload)}\n\n`);
			this.cache.push({ event, data, id, timestamp: Date.now(), retries: 0 });
			if (this.cache.length > CACHE_LIMIT) this.cache.shift();
			return id;
		});
	}

	ack(id: number) {
		this.cache = this.cache.filter((msg) => msg.id > id);
	}

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

	ping() {
		this.lastPing = Date.now();
		this.send('ping', null);
	}

	close() {
		return attempt(() => {
			this.cache = [];
			this.send('close', null);
			this.controller.close();
			this.onClose(this);
		});
	}

	notify(notif: Notification) {
		return this.send('notification', notif);
	}

	getSession() {
		return Session.Session.fromId(this.sessionId);
	}
}

class ConnectionArray {
	constructor(private readonly connections: Connection[]) {}

	add(connection: Connection) {
		this.connections.push(connection);
	}

	remove(connection: Connection) {
		const index = this.connections.indexOf(connection);
		if (index !== -1) this.connections.splice(index, 1);
	}

	each(callback: (conn: Connection) => void) {
		this.connections.forEach(callback);
	}

	send(event: string, data: unknown) {
		this.connections.forEach((conn) => conn.send(event, data));
	}

	notify(notification: Notification) {
		this.send('notification', notification);
	}

	get length() {
		return this.connections.length;
	}
}

export class SSE {
	private readonly connections = new Map<string, Connection>();
	private readonly emitter = new EventEmitter<{
		connect: Connection;
		disconnect: Connection;
	}>();

	public readonly on = this.emitter.on.bind(this.emitter);
	public readonly off = this.emitter.off.bind(this.emitter);

	constructor() {
		process.on('SIGTERM', () => this.shutdown());
		process.on('exit', () => this.shutdown());

		setInterval(() => {
			const now = Date.now();
			for (const connection of this.connections.values()) {
				if (now - connection.lastPing > DISCONNECT_TIMEOUT) {
					console.warn(`SSE Connection ${connection.uuid} timed out.`);
					connection.close();
				} else {
					connection.ping();
					connection.retryCached(now);
				}
			}
		}, PING_INTERVAL);
	}

	private shutdown() {
		for (const conn of this.connections.values()) conn.close();
	}

	connect(event: ConnectRequestEvent) {
		const me = this;
		return attemptAsync(async () => {
			const session = event.locals.session;
			session.update({ tabs: session.data.tabs + 1 });
			const uuid = event.params.uuid;

			const stream = new ReadableStream<string>({
				start(controller) {
					const connection = new Connection(uuid, session.id, controller, (conn) =>
						me.removeConnection(conn)
					);
					me.connections.set(uuid, connection);
					me.emitter.emit('connect', connection);
				},
				cancel() {
					const connection = me.connections.get(uuid);
					if (connection) connection.close();
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

	private removeConnection(connection: Connection) {
		if (this.connections.has(connection.uuid)) {
			this.connections.delete(connection.uuid);
			this.emitter.emit('disconnect', connection);
		}
	}

	send(event: string, data: unknown, condition?: (conn: Connection) => boolean | Promise<boolean>) {
		for (const conn of this.connections.values()) {
			if (condition && !condition(conn)) continue;
			conn.send(event, data);
		}
	}

	notify(notification: Notification, condition?: (conn: Connection) => boolean | Promise<boolean>) {
		this.send('notification', notification, condition);
	}

	each(callback: (conn: Connection) => void) {
		this.connections.forEach(callback);
	}

	fromSession(sessionId: string) {
		return new ConnectionArray(
			[...this.connections.values()].filter((conn) => conn.sessionId === sessionId)
		);
	}

	getConnection(uuid: string) {
		return this.connections.get(uuid);
	}

	receivePing(uuid: string) {
		const conn = this.connections.get(uuid);
		if (conn) conn.lastPing = Date.now();
	}
}

export const sse = new SSE();
