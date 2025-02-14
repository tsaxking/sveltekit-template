import type { RequestAction } from 'drizzle-struct/back-end';
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	Struct,
	StructError,
	DataError,
	StructStream,
	StructData,
	type Structable,
	globalCols
} from 'drizzle-struct/back-end';
import { PropertyAction, DataAction } from 'drizzle-struct/types';
import { Account } from './structs/account';
import { Session } from './structs/session';
import { Permissions } from './structs/permissions';
import { encode } from 'ts-utils/text';
import { sse } from '$lib/server/utils/sse';
import { z } from 'zod';
import terminal from '$lib/server/utils/terminal';
import { Logs } from './structs/log';
import type { Notification } from '$lib/types/notification';

export const handleEvent =
	(struct: Struct) =>
	async (event: RequestAction): Promise<Response> => {
		const notify = (notif: Notification) => {
			const uuid = event.request.request.headers.get('sse');
			if (!uuid) return;
			sse.getConnection(uuid)?.notify(notif);
		};

		// console.log('Handling event:', event);
		const error = (error: Error) => {
			notify({
				title: 'Unable to perform action',
				severity: 'danger',
				message: error.message
			});
			return new Response(
				JSON.stringify({
					success: false,
					message: error.message
				}),
				{ status: 200 }
			);
		};

		let roles: Permissions.RoleData[] = [];
		let account: Account.AccountData | undefined;
		let isAdmin = false;

		if (struct.data.name !== 'test') {
			account = event.request.locals.account;
			if (!account) return error(new StructError(struct, 'Not logged in'));

			roles = (await Permissions.allAccountRoles(account)).unwrap();
			isAdmin = !!(
				await Account.Admins.fromProperty('accountId', account.id, {
					type: 'single'
				})
			).unwrap();
		}

		const invalidPermissions = () => error(new StructError(struct, 'Invalid permissions'));

		const bypass = struct.bypasses
			.filter((b) => b.action === event.action || b.action === '*')
			.map((b) => b.condition);

		const runBypass = (
			data?: StructData<typeof struct.data.structure, typeof struct.data.name>
		) => {
			if (!account && struct.data.name === 'test') return true;
			if (!account) return false;
			if (isAdmin) return true;
			for (const fn of bypass) {
				const res = fn(account, data);
				if (res) return res;
			}
			return false;
		};

		if (event.action === DataAction.ReadVersionHistory) {
			const parsed = z
				.object({
					id: z.string()
				})
				.safeParse(event.data);

			if (!parsed.success) return error(new DataError(struct, 'Invalid data'));

			const data = (await struct.fromId(String(parsed.data.id))).unwrap();
			if (!data) return error(new DataError(struct, 'Data not found'));
			const history = (await data.getVersions()).unwrap();
			return new Response(
				JSON.stringify({
					success: true,
					data: history.map((v) => v.data)
				}),
				{ status: 200 }
			);
		}

		if (event.action === DataAction.DeleteVersion) {
			const parsed = z
				.object({
					id: z.string(),
					vhId: z.string()
				})
				.safeParse(event.data);
			if (!parsed.success) return error(new DataError(struct, 'Invalid data'));

			const data = (await struct.fromId(String(parsed.data.id))).unwrap();
			if (!data) return error(new DataError(struct, 'Data not found'));
			const version = (await data.getVersions()).unwrap().find((v) => v.vhId === parsed.data.vhId);
			if (!version) return error(new DataError(struct, 'Version not found'));

			(await version.delete()).unwrap();

			(
				await Logs.log({
					dataId: String(data.data.id),
					accountId: account?.id || 'unknown',
					type: 'delete-version',
					message: 'Deleted version',
					struct: struct.data.name
				})
			).unwrap();

			notify({
				title: 'Deleted',
				message: 'Deleted data version',
				severity: 'success'
			});

			return new Response(
				JSON.stringify({
					success: true
				}),
				{ status: 200 }
			);
		}

		if (event.action === DataAction.RestoreVersion) {
			const parsed = z
				.object({
					id: z.string(),
					vhId: z.string()
				})
				.safeParse(event.data);

			if (!parsed.success) return error(new DataError(struct, 'Invalid data'));
			const data = (await struct.fromId(String(parsed.data.id))).unwrap();
			if (!data) return error(new DataError(struct, 'Data not found'));
			const versions = (await data.getVersions()).unwrap().find((v) => v.vhId === parsed.data.vhId);
			if (!versions) return error(new DataError(struct, 'Version not found'));
			const res = await versions.restore();
			if (res.isErr()) return error(res.error);

			(
				await Logs.log({
					dataId: String(data.data.id),
					accountId: account?.id || 'unknown',
					type: 'restore-version',
					message: 'Restored version',
					struct: struct.data.name
				})
			).unwrap();

			notify({
				title: 'Restored',
				message: 'Restored data version',
				severity: 'success'
			});

			return new Response(
				JSON.stringify({
					success: true
				}),
				{ status: 200 }
			);
		}

		if (event.action === PropertyAction.Read) {
			const parsed = z
				.object({
					type: z.string(),
					args: z.unknown().optional()
				})
				.safeParse(event.data);

			if (!parsed.success) return error(new DataError(struct, 'Invalid data'));

			let streamer: StructStream<typeof struct.data.structure, typeof struct.data.name>;
			const type = (event.data as any).type as
				| 'all'
				| 'archived'
				| 'from-id'
				| 'property'
				| 'universe';
			switch (type) {
				case 'all':
					streamer = struct.all({
						type: 'stream'
					});
					break;
				case 'archived':
					streamer = struct.archived({
						type: 'stream'
					});
					break;
				case 'from-id':
					if (!Object.hasOwn((event.data as any).args, 'id'))
						return error(new DataError(struct, 'Missing Read id'));
					{
						const safe = z
							.object({
								id: z.string()
							})
							.safeParse(parsed.data.args);
						if (!safe.success) return error(new DataError(struct, 'Invalid Read id'));
						const data = (await struct.fromId(safe.data.id)).unwrap();
						if (!data) return error(new DataError(struct, 'Data not found'));
						return new Response(
							JSON.stringify({
								success: true,
								data: data.data
							}),
							{ status: 200 }
						);
					}
				case 'property':
					{
						const safe = z
							.object({
								key: z.string(),
								value: z.string()
							})
							.safeParse(parsed.data.args);
						if (!safe.success) return error(new DataError(struct, 'Invalid Read property'));
						streamer = struct.fromProperty(safe.data.key, safe.data.value, {
							type: 'stream'
						});
					}
					break;
				case 'universe':
					{
						const safe = z
							.object({
								universe: z.string()
							})
							.safeParse(parsed.data.args);

						if (!safe.success) return error(new DataError(struct, 'Invalid Read universe'));
						streamer = struct.fromProperty('universe', safe.data.universe, {
							type: 'stream'
						});
					}
					break;
				default:
					return error(new DataError(struct, 'Invalid Read type'));
			}

			let readable: ReadableStream;

			if (account) {
				readable = new ReadableStream({
					start(controller) {
						streamer.on('end', () => {
							// console.log('end');
							controller.enqueue('end\n\n');
							controller.close();
						});

						if (runBypass()) {
							streamer.pipe((d) => controller.enqueue(`${encode(JSON.stringify(d.data))}\n\n`));
							return;
						}
						const stream = Permissions.filterActionPipeline(
							account,
							roles,
							streamer as any,
							PropertyAction.Read,
							bypass
						);
						stream.pipe((d) => {
							// console.log('Sending:', d);
							controller.enqueue(`${encode(JSON.stringify(d))}\n\n`);
						});
					},
					cancel() {
						streamer.off('end');
						streamer.off('data');
						streamer.off('error');
					}
				});
			} else if (struct.data.name === 'test') {
				readable = new ReadableStream({
					start(controller) {
						streamer.on('end', () => {
							// console.log('end');
							controller.enqueue('end\n\n');
							controller.close();
						});

						streamer.pipe((d) => controller.enqueue(`${encode(JSON.stringify(d.data))}\n\n`));
					},
					cancel() {
						streamer.off('end');
						streamer.off('data');
						streamer.off('error');
					}
				});
			} else {
				return error(new StructError(struct, 'Not logged in'));
			}

			return new Response(readable, {
				status: 200,
				headers: {
					'Content-Type': 'text/event-stream'
				}
			});
		}

		if (event.action === DataAction.Create) {
			const create = async () => {
				const validateRes = struct.validate(event.data, {
					optionals: [
						'id',
						'created',
						'updated',
						'archived',
						'universe',
						'attributes',
						'lifetime',
						'canUpdate'
					]
				});
				if (!validateRes.success)
					return error(new DataError(struct, `Invalid data: ${validateRes.reason}`));
				// no need for zod validation, as it's already done in struct.validate
				const created = (await struct.new(event.data as any)).unwrap();

				const universe = event.request.request.headers.get('universe');
				if (universe) {
					(await created.setUniverse(universe)).unwrap();

					(
						await Logs.log({
							dataId: String(created.data.id),
							accountId: account?.id || 'unknown',
							type: 'create',
							message: 'Created data',
							struct: struct.data.name
						})
					).unwrap();
				}

				notify({
					title: 'Created',
					message: 'Created data',
					severity: 'success'
				});

				return new Response(
					JSON.stringify({
						success: true
					}),
					{ status: 201 }
				);
			};
			if (runBypass()) {
				return create();
			}
			if (!(await Permissions.canDo(roles, struct, DataAction.Create)).unwrap()) {
				return invalidPermissions();
			}

			return create();
		}

		if (event.action === PropertyAction.Update) {
			delete (event.data as any).created;
			delete (event.data as any).updated;
			delete (event.data as any).archived;
			// delete (event.data as any).universes;
			delete (event.data as any).attributes;
			delete (event.data as any).lifetime;
			delete (event.data as any).canUpdate;
			delete (event.data as any).universe;

			if (struct.data.safes !== undefined) {
				for (const key of Object.keys(event.data as object)) {
					if (struct.data.safes.includes(key)) {
						// user may not update safes
						delete (event.data as any)[key];
					}
				}
			}

			// this is all that's necessary. I don't want to zod validate with an unknown schema
			if (!Object.hasOwn(event.data as any, 'id'))
				return error(new DataError(struct, 'Missing id'));

			const data = event.data as Structable<typeof struct.data.structure & typeof globalCols>;
			const found = (await struct.fromId(String(data.id))).unwrap();
			if (!found) return error(new DataError(struct, 'Data not found'));

			if (runBypass()) {
				const res = await found.update(data);
				if (res.isErr()) return error(res.error);

				(
					await Logs.log({
						dataId: String(found.data.id),
						accountId: account?.id || 'unknown',
						type: 'update',
						message: 'Updated data',
						struct: struct.data.name
					})
				).unwrap();
			} else {
				const [res] = (
					await Permissions.filterAction(roles, [found as any], PropertyAction.Update)
				).unwrap();
				if (!res) return invalidPermissions();
				const updateRes = await found.update(
					Object.fromEntries(Object.entries(data).filter(([k]) => res[k])) as any
				);
				if (updateRes.isErr()) return error(updateRes.error);

				(
					await Logs.log({
						dataId: String(found.data.id),
						accountId: account?.id || 'unknown',
						type: 'update',
						message: 'Updated data',
						struct: struct.data.name
					})
				).unwrap();
			}

			notify({
				title: 'Updated',
				message: 'Updated data',
				severity: 'success'
			});

			return new Response(
				JSON.stringify({
					success: true
				}),
				{ status: 200 }
			);
		}

		if (event.action === DataAction.Archive) {
			const archive = async () => {
				const safe = z
					.object({
						id: z.string()
					})
					.safeParse(event.data);

				if (!safe.success) return error(new DataError(struct, 'Invalid data'));

				const found = (await struct.fromId(String(safe.data.id))).unwrap();
				if (!found) return error(new DataError(struct, 'Data not found'));

				(await found.setArchive(true)).unwrap();

				(
					await Logs.log({
						dataId: String(found.data.id),
						accountId: account?.id || 'unknown',
						type: 'archive',
						message: 'Archived data',
						struct: struct.data.name
					})
				).unwrap();

				notify({
					title: 'Archived',
					message: 'Archived data',
					severity: 'success'
				});

				return new Response(
					JSON.stringify({
						success: true
					}),
					{ status: 200 }
				);
			};
			if (runBypass()) return archive();
			if (!(await Permissions.canDo(roles, struct, DataAction.Create)).unwrap())
				return invalidPermissions();

			return archive();
		}

		if (event.action === DataAction.Delete) {
			const remove = async () => {
				const safe = z
					.object({
						id: z.string()
					})
					.safeParse(event.data);

				if (!safe.success) return error(new DataError(struct, 'Invalid data'));

				const found = (await struct.fromId(safe.data.id)).unwrap();
				if (!found) return error(new DataError(struct, 'Data not found'));

				(await found.delete()).unwrap();

				(
					await Logs.log({
						dataId: String(found.data.id),
						accountId: account?.id || 'unknown',
						type: 'delete',
						message: 'Deleted data',
						struct: struct.data.name
					})
				).unwrap();

				notify({
					title: 'Deleted',
					message: 'Deleted data',
					severity: 'success'
				});
				return new Response(
					JSON.stringify({
						success: true
					}),
					{ status: 200 }
				);
			};
			if (runBypass()) return remove();
			if (!(await Permissions.canDo(roles, struct, DataAction.Create)).unwrap())
				return invalidPermissions();

			return remove();
		}

		if (event.action === DataAction.RestoreArchive) {
			const restore = async () => {
				const safe = z
					.object({
						id: z.string()
					})
					.safeParse(event.data);

				if (!safe.success) return error(new DataError(struct, 'Invalid data'));

				const found = (await struct.fromId(safe.data.id)).unwrap();
				if (!found) return error(new DataError(struct, 'Data not found'));

				(await found.setArchive(false)).unwrap();

				(
					await Logs.log({
						dataId: String(found.data.id),
						accountId: account?.id || 'unknown',
						type: 'restore',
						message: 'Restored data',
						struct: struct.data.name
					})
				).unwrap();

				notify({
					title: 'Restored',
					message: 'Restored data',
					severity: 'success'
				});

				return new Response(
					JSON.stringify({
						success: true
					}),
					{ status: 200 }
				);
			};
			if (runBypass()) return restore();
			if (!(await Permissions.canDo(roles, struct, DataAction.Create)).unwrap())
				return invalidPermissions();
			return restore();
		}

		return error(new StructError(struct, 'Invalid action'));
	};

export const connectionEmitter = (struct: Struct) => {
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

			// const universes = data.getUniverses();
			// if (universes.isErr()) return console.error(universes.error);

			const roles = await Permissions.allAccountRoles(a);
			if (roles.isErr()) return console.error(roles.error);
			const r = roles.value;

			// if (!r.some((r) => universes.value.includes(r.data.universe))) {
			if (!r.some((r) => r.universe === data.universe)) {
				return;
			}

			const res = await Permissions.filterAction(r, [data as any], PropertyAction.Read);
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

	struct.emit('build', undefined);
};
