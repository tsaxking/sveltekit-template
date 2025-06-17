import { Session } from '../structs/session';
import { Struct, type Blank, StructData } from 'drizzle-struct/back-end';
import { Account } from '../structs/account';
import { Permissions } from '../structs/permissions';
import { PropertyAction } from 'drizzle-struct/types';
import { sse } from './sse';
import { Redis } from './redis';

export const createStructEventService = (struct: Struct<Blank, string>) => {
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
		Redis.emit(`struct:${struct.name}:create`, data);
	});

	struct.on('update', (data) => {
		emitToConnections('update', data.to);
		Redis.emit(`struct:${struct.name}:update`, data);
	});

	struct.on('archive', (data) => {
		emitToConnections('archive', data);
		Redis.emit(`struct:${struct.name}:archive`, data);
	});

	struct.on('delete', (data) => {
		emitToConnections('delete', data);
		Redis.emit(`struct:${struct.name}:delete`, data);
	});

	struct.on('restore', (data) => {
		emitToConnections('restore', data);
		Redis.emit(`struct:${struct.name}:restore`, data);
	});

	struct.on('delete-version', (data) => {
		Redis.emit(`struct:${struct.name}:delete-version`, data);
	});

	struct.on('restore-version', (data) => {
		Redis.emit(`struct:${struct.name}:restore-version`, data);
	});

	struct.emit('build');
};
