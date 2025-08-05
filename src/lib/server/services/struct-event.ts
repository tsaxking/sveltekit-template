import { Session } from '../structs/session';
import { Struct, type Blank, StructData, type Structable, DataVersion } from 'drizzle-struct/back-end';
import { Account } from '../structs/account';
import { Permissions } from '../structs/permissions';
import { PropertyAction } from 'drizzle-struct/types';
import { sse } from './sse';
import { Redis } from './redis';
import { z } from 'zod';
import { EventEmitter } from 'ts-utils/event-emitter';
import { attempt } from 'ts-utils/check';

export const createStructEventService = (struct: Struct<Blank, string>) => {
	const pub = Redis.getPub();
	// Permission handling
	const emitToConnections = async (
		event: string,
		data: StructData<typeof struct.data.structure, typeof struct.data.name>
	) => {
		if (!struct.frontend) return;
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
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:create`, JSON.stringify(data.data));
	});

	struct.on('update', (data) => {
		emitToConnections('update', data.to);
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:update`, JSON.stringify({
			from: data.from,
			to: data.to.data
		}));
	});

	struct.on('archive', (data) => {
		emitToConnections('archive', data);
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:archive`, data.id);
	});

	struct.on('delete', (data) => {
		emitToConnections('delete', data);
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:delete`, data.id);
	});

	struct.on('restore', (data) => {
		emitToConnections('restore', data);
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:restore`, data.id);
	});

	struct.on('delete-version', (data) => {
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:delete-version`, {
			vhId: data.vhId,
			id: data.id,
		});
	});

	struct.on('restore-version', (data) => {
		if (pub.isOk()) pub.value.emit(`struct:${struct.name}:restore-version`, {
			vhId: data.vhId,
			id: data.id,
		});
	});

	struct.emit('build');
};

export const createStructListenerService = (struct: Struct<Blank, string>) => {
	return attempt(() => {
		const sub = Redis.getSub().unwrap();

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

		const listeningTo = new Set<string>();

		const listenTo = (event: 'create' | 'update' | 'archive' | 'delete' | 'restore' | 'delete-version' | 'restore-version') => () => {
			if (listeningTo.has(event)) return;
			listeningTo.add(event);

			sub.on(`struct:${struct.name}:${event}`, async (data: string) => {
				switch (event) {
					case 'archive':
					case 'delete':
					case 'restore':
						{
							const res = await struct.fromId(data);
							if (res.isOk() && res.value) {
								em.emit(event, res.value);
							}
						}
						break;
					case 'create':
						{
							const parsed = struct.getZodSchema().safeParse(JSON.parse(data));
							if (parsed.success) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								em.emit(event, struct.Generator(parsed.data as any));
							}
						}
						break;
					case 'update':
						{
							const parsed = z.object({
								from: struct.getZodSchema(),
								to: struct.getZodSchema(),
							}).safeParse(JSON.parse(data));
							if (parsed.success) {
								em.emit(event, {
									from: parsed.data.from,
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									to: struct.Generator(parsed.data.to as any),
								});
							}
						}
						break;
					case 'delete-version':
					case 'restore-version':
						{
							const version = await struct.fromVhId(data);
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
	});
};
