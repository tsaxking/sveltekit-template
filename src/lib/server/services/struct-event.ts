/**
 * @fileoverview Struct event bridge for SSE and Redis.
 *
 * Emits struct CRUD events to connected clients and propagates events across
 * servers via Redis.
 *
 * @example
 * import { createStructEventService } from '$lib/server/services/struct-event';
 * createStructEventService(MyStruct);
 */
import { Session } from '../structs/session';
import { Struct, type Blank, StructData, type Structable, DataVersion } from 'drizzle-struct';
import { Account } from '../structs/account';
import { Permissions } from '../structs/permissions';
import { PropertyAction } from '../../types/struct';
import { sse } from './sse';
import { z } from 'zod';
import { EventEmitter } from 'ts-utils/event-emitter';
import terminal from '../utils/terminal';
import { attempt } from 'ts-utils/check';
import redis from './redis';
import structRegistry from './struct-registry';

const pack = (data: unknown) => {
	return JSON.stringify({
		from: redis.name,
		payload: data
	});
};

const unpack = <T>(
	data: {
		[from: string]: unknown;
		payload?: unknown;
	},
	type: z.ZodType<T>
) => {
	return attempt<T>(() => {
		const parsed = z
			.object({
				from: z.string(),
				payload: type
			})
			.parse(data);
		if (parsed.from === redis.name) {
			throw new Error('Data from self, ignoring');
		}
		return parsed.payload as T;
	});
};

/**
 * This will start a service that listens to events from a struct and emits them to connected clients.
 * If Redis is connected, it will also publish the events to the Redis ecosystem for the `createStructListenerService` to pick up.
 * @param struct The struct to create the service for.
 */
export const createStructEventService = (struct: Struct<Blank, string>) => {
	// Permission handling
	const emitToConnections = async (
		event: string,
		data: StructData<typeof struct.data.structure, typeof struct.data.name>
	) => {
		if (!structRegistry.has(struct.name)) return;
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

	struct.on('create', (data) => {
		emitToConnections('create', data);
		redis.emit(`struct:${struct.name}:create`, pack(data.data));
	});

	struct.on('update', (data) => {
		emitToConnections('update', data.to);
		redis.emit(
			`struct:${struct.name}:update`,
			pack({
				from: data.from,
				to: data.to.data
			})
		);
	});

	struct.on('archive', (data) => {
		emitToConnections('archive', data);
		redis.emit(`struct:${struct.name}:archive`, pack(data.id));
	});

	struct.on('delete', (data) => {
		emitToConnections('delete', data);
		redis.emit(`struct:${struct.name}:delete`, pack(data.id));
	});

	struct.on('restore', (data) => {
		emitToConnections('restore', data);
		redis.emit(`struct:${struct.name}:restore`, pack(data.id));
	});

	struct.on('delete-version', (data) => {
		redis.emit(
			`struct:${struct.name}:delete-version`,
			pack({
				vhId: data.vhId,
				id: data.id
			})
		);
	});

	struct.on('restore-version', (data) => {
		redis.emit(
			`struct:${struct.name}:restore-version`,
			pack({
				vhId: data.vhId,
				id: data.id
			})
		);
	});

	struct.emit('build');
};

/**
 * This will start a service that listens to events from a struct from other servers and emits them for this server to use.
 * @param struct The struct to create the service for.
 * @returns {EventEmitter} An event emitter that emits the events from the struct.
 */
export const createStructListenerService = (struct: Struct<Blank, string>) => {
	const em = new EventEmitter<{
		create: StructData<typeof struct.data.structure, typeof struct.data.name>;
		update: {
			from: Structable<typeof struct.data.structure>;
			to: StructData<typeof struct.data.structure, typeof struct.data.name>;
		};
		archive: StructData<typeof struct.data.structure, typeof struct.data.name>;
		delete: StructData<typeof struct.data.structure, typeof struct.data.name>;
		restore: StructData<typeof struct.data.structure, typeof struct.data.name>;
		'delete-version': DataVersion<typeof struct.data.structure, typeof struct.data.name>;
		'restore-version': DataVersion<typeof struct.data.structure, typeof struct.data.name>;
	}>();

	try {
		const service = redis.createListener(
			`struct:${struct.name}:*`,
			Object.fromEntries(
				[
					'create',
					'update',
					'archive',
					'delete',
					'restore',
					'delete-version',
					'restore-version'
				].map((e) => [
					`struct:${struct.name}:${e}`,
					z.object({ from: z.string(), payload: z.unknown() })
				])
			)
		);
		const listeningTo = new Set<string>();

		const listenTo =
			(
				event:
					| 'create'
					| 'update'
					| 'archive'
					| 'delete'
					| 'restore'
					| 'delete-version'
					| 'restore-version'
			) =>
			() => {
				if (listeningTo.has(event)) return;
				listeningTo.add(event);

				service.on(`struct:${struct.name}:${event}`, async (data) => {
					switch (event) {
						case 'archive':
						case 'delete':
						case 'restore':
							{
								const unpacked = unpack(data.data, z.string());
								if (unpacked.isErr()) return;
								const res = await struct.fromId(unpacked.value);
								if (res.isOk() && res.value) {
									em.emit(event, res.value);
								}
							}
							break;
						case 'create':
							{
								const unpacked = unpack(data.data, struct.getZodSchema());
								if (unpacked.isErr()) return;
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								em.emit(event, struct.Generator(unpacked.value as any));
							}
							break;
						case 'update':
							{
								const unpacked = unpack(
									data,
									z.object({
										from: struct.getZodSchema(),
										to: struct.getZodSchema()
									})
								);
								if (unpacked.isErr()) return;
								em.emit(event, {
									from: unpacked.value.from,
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									to: struct.Generator(unpacked.value.to as any)
								});
							}
							break;
						case 'delete-version':
						case 'restore-version':
							{
								const unpacked = unpack(data.data, z.string());
								if (unpacked.isErr()) return;
								const version = await struct.fromVhId(unpacked.value);
								if (version.isOk() && version.value) {
									em.emit(event, version.value);
								}
							}
							break;
					}
				});
			};

		em.onceListen('create', listenTo('create'));
		em.onceListen('update', listenTo('update'));
		em.onceListen('archive', listenTo('archive'));
		em.onceListen('delete', listenTo('delete'));
		em.onceListen('restore', listenTo('restore'));
	} catch (error) {
		terminal.error('Error setting up struct listener service:', error);
	}

	return em;
};
