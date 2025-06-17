/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'redis';
import { attemptAsync, type ResultPromise } from 'ts-utils/check';
import { EventEmitter } from 'ts-utils/event-emitter';
import { z } from 'zod';
import { uuid } from '../utils/uuid';
import terminal from '../utils/terminal';

export namespace Redis {
	const REDIS_NAME = process.env.REDIS_NAME || 'default';
	let id = -1;
	export const clientId = uuid();
	// export const _sub = createClient();
	// export const _pub = createClient();
	export let _sub: ReturnType<typeof createClient> | undefined;
	export let _pub: ReturnType<typeof createClient> | undefined;
	_sub?.on('error', (error: Error) => {
		globalEmitter.emit('sub-error', error);
	});

	_sub?.on('connect', () => {
		globalEmitter.emit('sub-connect', undefined);
	});
	_sub?.on('disconnect', () => {
		globalEmitter.emit('sub-disconnect', undefined);
	});
	_sub?.on('reconnect', () => {
		globalEmitter.emit('sub-reconnect', undefined);
	});

	_pub?.on('error', (error: Error) => {
		globalEmitter.emit('pub-error', error);
	});
	_pub?.on('connect', () => {
		globalEmitter.emit('pub-connect', undefined);
	});
	_pub?.on('disconnect', () => {
		globalEmitter.emit('pub-disconnect', undefined);
	});
	_pub?.on('reconnect', () => {
		globalEmitter.emit('pub-reconnect', undefined);
	});

	export const connect = (): ResultPromise<void> => {
		return attemptAsync(async () => {
			if (_sub?.isOpen && _pub?.isOpen && _sub?.isReady && _pub?.isReady) {
				return; // Already connected
			}
			_sub = createClient();
			_pub = createClient();

			await Promise.all([_sub?.connect(), _pub?.connect()]);
			return new Promise<void>((res, rej) => {
				_sub?.subscribe('discovery:i_am', (message) => {
					console.log(`Received discovery:iam message: ${message}`);
					const [name, instanceId] = message.split(':');
					console.log(`Discovery message from instance: ${name} (${instanceId})`, clientId);
					if (instanceId === clientId) return res(); // Ignore our own message and resolve. The pub/sub system is working.
					_pub?.publish('discovery:welcome', REDIS_NAME + ':' + instanceId);
					console.log(`Discovered instance: ${name} (${instanceId})`);
				});
				_sub?.subscribe('discovery:welcome', (message) => {
					console.log(`Received discovery:welcome message: ${message}`);
					const [name, instanceId] = message.split(':');
					if (instanceId === clientId) return; // Ignore our own message

					console.log(`Welcome message from instance: ${name} (${instanceId})`);
					if (name === REDIS_NAME) {
						terminal.warn(
							`Another instance of Redis with name "${REDIS_NAME}" is already running. This may cause conflicts.`
						);
						res();
					}
				});
				_pub?.publish('discovery:i_am', REDIS_NAME + ':' + clientId);
				setTimeout(() => {
					rej(new Error('Redis connection timed out. Please check your Redis server.'));
				}, 1000); // Wait for a second to ensure the discovery messages are processed
			});
		});
	};

	const send = <
		T extends {
			[key: string]: z.ZodType;
		}
	>(
		message: RedisMessage<T>
	): ResultPromise<void> => {
		return attemptAsync(async () => {
			const payload = JSON.stringify({
				event: message.event,
				data: message.data,
				date: message.date.toISOString(),
				id: message.id
			});
			_pub?.publish('channel:' + REDIS_NAME, payload);
		});
	};

	type RedisMessage<
		T extends {
			[key: string]: z.ZodType;
		}
	> = {
		event: keyof T;
		data: z.infer<T[keyof T]>;
		date: Date;
		id: number;
	};

	class ListeningService<
		Events extends {
			[key: string]: z.ZodType;
		},
		Name extends string
	> {
		public static services = new Map<string, ListeningService<any, any>>();

		private readonly em = new EventEmitter<{
			[K in keyof Events]: {
				date: Date;
				id: number;
				data: z.infer<Events[K]>;
			};
		}>();

		public on = this.em.on.bind(this.em);
		public once = this.em.once.bind(this.em);
		public off = this.em.off.bind(this.em);
		private emit = this.em.emit.bind(this.em);

		constructor(
			public readonly name: Name,
			public readonly events: Events
		) {
			if (name === REDIS_NAME) {
				throw new Error(
					`Service name "${name}" cannot be the same as the Redis instance name "${REDIS_NAME}".`
				);
			}
			if (ListeningService.services.has(this.name)) {
				throw new Error(`Service with name "${this.name}" already exists.`);
			}

			_sub?.subscribe('channel:' + this.name, (message: string) => {
				try {
					const parsed = z
						.object({
							event: z.string(),
							data: z.unknown(),
							date: z.string().transform((v) => new Date(v)),
							id: z.number()
						})
						.parse(JSON.parse(message));

					if (parsed.event in this.events) {
						const event = parsed.event as keyof Events;
						const dataSchema = this.events[event];
						const data = dataSchema.parse(parsed.data);
						this.emit(event, {
							data,
							date: parsed.date,
							id: parsed.id
						});
					}
				} catch (error) {
					console.error(`[Redis:${this.name}] Error parsing message for service:`, error);
				}
			});

			ListeningService.services.set(this.name, this);
		}
	}

	export const createListeningService = <
		E extends {
			[key: string]: z.ZodType;
		},
		Name extends string
	>(
		name: Name,
		events: E
	) => {
		if (name.includes(':')) {
			throw new Error(`Service name "${name}" cannot contain a colon (:) character.`);
		}
		return new ListeningService(name, events);
	};

	export const emit = (event: string, data: unknown) => {
		return send({
			event,
			data,
			date: new Date(),
			id: id++
		});
	};

	type GlobalEvents = {
		'pub-error': Error;
		'pub-connect': void;
		'pub-disconnect': void;
		'pub-reconnect': void;
		'sub-error': Error;
		'sub-connect': void;
		'sub-disconnect': void;
		'sub-reconnect': void;
	};

	const globalEmitter = new EventEmitter<GlobalEvents>();

	export const on = globalEmitter.on.bind(globalEmitter);
	export const once = globalEmitter.once.bind(globalEmitter);
	export const off = globalEmitter.off.bind(globalEmitter);
}
