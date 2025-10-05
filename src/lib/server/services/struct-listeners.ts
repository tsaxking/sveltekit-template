/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Listener system for struct-based backend events, supporting authentication, bypass, and payload validation.
 * Provides base and specialized listeners for function calls, queries, and data sending from the frontend.
 * Uses Zod for schema validation and supports async/await for all hooks.
 */
import { type RequestEvent } from '@sveltejs/kit';
import {
	DataVersion,
	StructStream,
	type Blank,
	type Struct,
	type Structable,
	StructData,
	type TsType
} from 'drizzle-struct/back-end';
import { z } from 'zod';
import { attemptAsync } from 'ts-utils/check';
import terminal from '../utils/terminal';
import { DataAction, PropertyAction } from 'drizzle-struct/types';
import { Account } from '../structs/account';

/**
 * Callback type for listener handlers.
 * @template DataType - Payload type
 * @template ReturnType - Return type
 */
type CB<DataType, ReturnType> = (
	request: RequestEvent,
	data: DataType
) => ListenerStatus<ReturnType> | Promise<ListenerStatus<ReturnType>>;

/**
 * Type for authentication result. True for success, string for failure reason, false for unknown failure.
 */
type AuthResult = boolean | string;
/**
 * Type for authentication function.
 */
type Auth<DataType> = (request: RequestEvent, data: DataType) => AuthResult | Promise<AuthResult>;

/**
 * Type for bypass function, returns true to bypass authentication.
 */
type Bypass<DataType> = (request: RequestEvent, data: DataType) => boolean | Promise<boolean>;

/**
 * Result of authentication check.
 */
type AuthedResult =
	| {
			authed: false;
			reason: string;
	  }
	| {
			authed: true;
	  };

/**
 * Status returned by listeners, indicating success or failure and optional data/message.
 */
type ListenerStatus<ReturnType> =
	| {
			success: true;
			data?: ReturnType;
			message?: string;
	  }
	| {
			success: false;
			message: string;
	  };

/**
 * Base class for all listeners. Handles authentication, bypass, and schema validation.
 * @template Event - Event name type
 * @template DataType - Payload type
 * @template ReturnType - Return type
 */
class ListenerBase<Event extends string, DataType, ReturnType> {
	constructor(
		public readonly event: Event,
		public readonly struct: Struct<any, any>,
		public readonly cb: CB<DataType, ReturnType>,
		public readonly schema: z.ZodType<DataType>
	) {}

	/**
	 * Set of authentication functions for this listener.
	 */
	public readonly auths = new Set<Auth<DataType>>();

	/**
	 * Add an authentication function to this listener.
	 */
	auth(auth: Auth<DataType>) {
		this.auths.add(auth);
		return this;
	}

	/**
	 * Run all bypass and authentication functions for this listener.
	 * @returns {Promise<AuthedResult>} Result of authentication check.
	 */
	authed(request: RequestEvent, data: DataType) {
		return attemptAsync<AuthedResult>(async () => {
			for (const bypass of this.bypasses) {
				const res = await bypass(request, data);
				if (res)
					return {
						authed: true
					};
			}
			for (const auth of this.auths) {
				const res = await auth(request, data);
				if (typeof res === 'string') {
					return {
						authed: false,
						reason: res
					};
				} else if (res === false) {
					return {
						authed: false,
						reason: 'unknown'
					};
				}
			}

			return {
				authed: true
			};
		});
	}

	/**
	 * Set of bypass functions for this listener.
	 */
	public readonly bypasses = new Set<Bypass<DataType>>();

	/**
	 * Add a bypass function to this listener.
	 */
	bypass(bypass: Bypass<DataType>) {
		this.bypasses.add(bypass);
		return this;
	}

	/**
	 * Run the listener: parse payload, check authentication, and execute callback.
	 * @param request - SvelteKit request event
	 * @returns {Promise<ListenerStatus<ReturnType>>} Listener status
	 */
	async run(request: RequestEvent, data: unknown): Promise<ListenerStatus<ReturnType>> {
		const parsed = this.schema.safeParse(data);
		if (!parsed.success) {
			terminal.error(parsed.error);
			return {
				success: false,
				message: 'Invalid payload'
			};
		}

		const authed = await this.authed(request, parsed.data);
		if (authed.isErr()) {
			return {
				success: false,
				message: 'Internal server error'
			};
		}
		if (!authed.value.authed) {
			return {
				success: false,
				message: `Unauthorized: ${authed.value.reason}`
			};
		}

		try {
			return this.cb(request, parsed.data);
		} catch (error) {
			terminal.error(error);
			return {
				success: false,
				message: 'Internal server error'
			};
		}
	}
}

/**
 * Return type for call listeners (void).
 */
type CallReturnType = unknown;

/**
 * Listener for function calls from the frontend (no return value).
 * @template Event - Event name type
 * @template DataType - Payload type
 * @template ReturnType - Return type (void)
 */
export class CallListener<
	Event extends string,
	DataType,
	ReturnType extends CallReturnType
> extends ListenerBase<Event, DataType, ReturnType> {
	/**
	 * Map of all registered call listeners by event name.
	 */
	public static readonly listeners = new Map<string, CallListener<string, any, any>>();

	/**
	 * Register a new call listener for an event.
	 */
	public static on<Event extends string, DataType, ReturnType extends CallReturnType>(
		event: Event,
		struct: Struct<any, any>,
		schema: z.ZodType<DataType>,
		cb: CB<DataType, ReturnType>
	) {
		if (CallListener.listeners.has(struct.name + ':' + event)) {
			throw new Error('Listener already exists for event: ' + struct.name + ':' + event);
		}
		const listener = new CallListener(event, struct, cb, schema);
		CallListener.listeners.set(struct.name + ':' + event, listener);
		return listener;
	}

	public static run<_S extends Blank, _N extends string>(
		request: RequestEvent,
		struct: Struct<_S, _N>,
		fn: string,
		data: unknown
	) {
		return attemptAsync<ListenerStatus<CallReturnType> | undefined>(async () => {
			const listener = CallListener.listeners.get(struct.name + ':' + fn);
			if (!listener) {
				return undefined;
			}
			return listener.run(request, data);
		});
	}
}

/**
 * Return type for query listeners (array or promise of struct data).
 */
type QueryReturnType<StructType extends Blank, Name extends string> =
	| StructData<StructType, Name>[]
	| StructStream<StructType, Name>;

/**
 * Callback type for query listeners.
 */
type QueryCBReturnType<StructType extends Blank, Name extends string> =
	| StructData<StructType, Name>[]
	| StructStream<StructType, Name>;
/**
 * Type for query callback function.
 */
type QueryCBType<DataType, StructType extends Blank, Name extends string> = (
	request: RequestEvent,
	data: DataType
) => QueryCBReturnType<StructType, Name> | Promise<QueryCBReturnType<StructType, Name>>;

/**
 * Listener for querying struct data from the frontend.
 * @template Event - Event name type
 * @template StructType - Struct blank type
 * @template Name - Struct name type
 * @template DataType - Payload type
 * @template ReturnType - Return type (array or promise of struct data)
 */
export class QueryListener<
	Event extends string,
	StructType extends Blank,
	Name extends string,
	DataType,
	ReturnType extends QueryReturnType<StructType, Name>
> extends ListenerBase<Event, DataType, ReturnType> {
	/**
	 * Map of all registered query listeners by event name.
	 */
	public static readonly listeners = new Map<
		string,
		QueryListener<string, Blank, string, any, QueryReturnType<Blank, string>>
	>();

	/**
	 * Register a new query listener for an event.
	 */
	public static on<Event extends string, StructType extends Blank, Name extends string, DataType>(
		event: Event,
		struct: Struct<StructType, Name>,
		schema: z.ZodType<DataType>,
		cb: QueryCBType<DataType, StructType, Name>
	) {
		if (QueryListener.listeners.has(struct.name + ':' + event)) {
			throw new Error('Listener already exists for event: ' + struct.name + ':' + event);
		}
		const listener = new QueryListener(
			event,
			struct,
			async (request, event) => {
				const res = await cb(request, event);
				let data: StructData<StructType, Name>[];
				if (res instanceof StructStream) {
					data = await res.await().unwrap();
				} else {
					data = res;
				}

				return {
					success: true,
					data: data as any // Cast to any to match ReturnType
				};
			},
			schema
		);
		QueryListener.listeners.set(struct.name + ':' + event, listener);
		return listener;
	}

	public static run<StructType extends Blank, Name extends string>(
		request: RequestEvent,
		struct: Struct<StructType, Name>,
		data: unknown
	) {
		return attemptAsync<ListenerStatus<StructData<StructType, Name>['data'][]> | undefined>(
			async () => {
				const parsed = z
					.object({
						args: z.object({
							query: z.string(),
							data: z.unknown()
						})
					})
					.safeParse(data);
				if (!parsed.success) {
					return {
						success: false,
						message: 'Invalid body'
					};
				}

				const listener = QueryListener.listeners.get(struct.name + ':' + parsed.data.args.query);
				if (!listener) {
					return undefined;
				}
				const res = await listener.run(request, parsed.data.args.data);
				if (res.success) {
					if (res.data instanceof StructStream) {
						return {
							...res,
							data: (await res.data.await().unwrap()).map((r) => r.safe()) as any
						};
					} else if (Array.isArray(res.data)) {
						return {
							...res,
							data: res.data.map((r) => r.safe()) as any
						};
					} else {
						return {
							success: false,
							message: 'Invalid return type from listener'
						};
					}
				}
				return {
					success: res.success,
					message: res.message
				};
			}
		);
	}
}

/**
 * Return type for send listeners (unknown).
 */
type SendReturnType = unknown;

/**
 * Listener for sending any data from the frontend.
 * @template Event - Event name type
 * @template DataType - Payload type
 * @template ReturnType - Return type (unknown)
 */
export class SendListener<
	Event extends string,
	DataType,
	ReturnType extends SendReturnType
> extends ListenerBase<Event, DataType, ReturnType> {
	/**
	 * Map of all registered send listeners by event name.
	 */
	public static readonly listeners = new Map<string, SendListener<string, any, any>>();

	/**
	 * Register a new send listener for an event.
	 */
	public static on<Event extends string, DataType, ReturnType extends SendReturnType>(
		event: Event,
		struct: Struct<any, any>,
		schema: z.ZodType<DataType>,
		cb: CB<DataType, ReturnType>
	) {
		if (SendListener.listeners.has(struct.name + ':' + event)) {
			throw new Error('Listener already exists for event: ' + struct.name + ':' + event);
		}
		const listener = new SendListener(event, struct, cb, schema);
		SendListener.listeners.set(struct.name + ':' + event, listener);
		return listener;
	}

	public static run<StructType extends Blank, Name extends string>(
		request: RequestEvent,
		struct: Struct<StructType, Name>,
		fn: string,
		data: unknown
	) {
		return attemptAsync<ListenerStatus<SendReturnType> | undefined>(async () => {
			const listener = SendListener.listeners.get(fn);
			if (!listener) {
				return undefined;
			}
			return listener.run(request, data);
		});
	}
}

type IDOnly = {
	id: string;
};

type Create<_S extends Blank> = Structable<_S>;
type Update<_S extends Blank> = Partial<Structable<_S>> & IDOnly;
type VersionAction = {
	id: string;
	vhId: string;
};

type ReadTypes = 'all' | 'archived' | 'property' | 'from-id' | never;

type Read<_S extends Blank, Type extends ReadTypes> = Type extends 'all' | 'archived'
	? void
	: Type extends 'property'
		? {
				key: keyof _S;
				value: TsType<_S[keyof _S]['_']['dataType']>;
			}
		: Type extends 'from-id'
			? IDOnly
			: never;

type Attributes = {
	id: string;
	attributes: string[];
};

type Actions = DataAction | PropertyAction | 'set-attributes';

type _ActionDataType<
	Action extends Actions,
	_S extends Blank,
	ReadType extends ReadTypes
> = Action extends DataAction.Archive
	? IDOnly
	: Action extends DataAction.Create
		? Create<Blank>
		: Action extends DataAction.Delete
			? IDOnly
			: Action extends DataAction.DeleteVersion
				? VersionAction
				: Action extends DataAction.RestoreArchive
					? IDOnly
					: Action extends DataAction.RestoreVersion
						? VersionAction
						: Action extends PropertyAction.Read
							? Read<_S, ReadType>
							: Action extends PropertyAction.ReadArchive
								? Read<_S, 'archived'>
								: Action extends PropertyAction.ReadVersionHistory
									? Read<_S, 'from-id'>
									: Action extends PropertyAction.Update
										? Update<_S>
										: Action extends 'set-attributes'
											? Attributes
											: never;
type BypassDataConfig<
	_Action extends Actions,
	_S extends Blank,
	_ReadType extends ReadTypes = ReadTypes
> = unknown;
type BypassFn<Action extends Actions, _S extends Blank, _R extends ReadTypes> = (
	request: RequestEvent,
	data: BypassDataConfig<Action, _S>
) => boolean | Promise<boolean>;
type BypassException<Action extends Actions, _S extends Blank, _R extends ReadTypes> = (
	request: RequestEvent,
	data: BypassDataConfig<Action, _S>
) => boolean | Promise<boolean>;

type AccountBypassFn<StructType extends Blank, Name extends string> = (
	account: Account.AccountData,
	data: StructData<StructType, Name> | DataVersion<StructType, Name>
) => boolean | Promise<boolean>;

// const getDataZodType = <_S extends Blank, _N extends string, Action extends Actions, ReadType extends ReadTypes>(
//     config: {
//         struct: Struct<_S, _N>,
//         action: Action,
//         readType?: ReadType,
//     },
// ): z.ZodType<ActionDataType<Action, _S, ReadType>> => {
//     const { struct, action, readType } = config;
//     // DataAction.Create: all struct fields except globalCols
//     if (action === DataAction.Create) {
//         return struct.getZodSchema({
//             not: Object.keys(globalCols) as (keyof typeof globalCols)[],
//         }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     // DataAction.Archive, DataAction.Delete, DataAction.RestoreArchive: { id: string }
//     if (
//         action === DataAction.Archive ||
//         action === DataAction.Delete ||
//         action === DataAction.RestoreArchive
//     ) {
//         return z.object({ id: z.string() }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     // DataAction.DeleteVersion, DataAction.RestoreVersion: { id: string, vhId: string }
//     if (action === DataAction.DeleteVersion || action === DataAction.RestoreVersion) {
//         return z.object({ id: z.string(), vhId: z.string() }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     // PropertyAction.Update: Partial struct + id
//     if (action === PropertyAction.Update) {
//         // Partial struct fields
//         const base = struct.getZodSchema({ not: Object.keys(globalCols) as (keyof typeof globalCols)[] }).partial();
//         return base.extend({ id: z.string() }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     // PropertyAction.Read, PropertyAction.ReadArchive, PropertyAction.ReadVersionHistory
//     if (action === PropertyAction.Read) {
//         if (readType === 'property') {
//             // { key: keyof _S, value: TsType<_S[keyof _S]['_']['dataType']> }
//             return z.object({
//                 key: z.string(), // Could be z.enum([...]) if you want to restrict to keys
//                 value: z.unknown(), // Can't infer type at runtime
//             }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//         } else if (readType === 'from-id') {
//             return z.object({ id: z.string() }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//         } else {
//             // 'all' or 'archived' or void
//             return z.undefined() as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//         }
//     }
//     if (action === PropertyAction.ReadArchive) {
//         return z.undefined() as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     if (action === PropertyAction.ReadVersionHistory) {
//         return z.object({ id: z.string() }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     // set-attributes: { id: string, attributes: string[] }
//     if (action === 'set-attributes') {
//         return z.object({
//             id: z.string(),
//             attributes: z.array(z.string()),
//         }) as unknown as z.ZodType<ActionDataType<Action, _S, ReadType>>;
//     }
//     // Fallback: never
//     throw new Error(`No schema for action: ${String(action)}`);
// };

class AccountBypass<Action extends Actions, StructType extends Blank, Name extends string> {
	public static readonly listeners = new Set<AccountBypass<Actions, any, string>>();

	public static on<Action extends Actions, StructType extends Blank, Name extends string>(
		action: Action,
		struct: Struct<StructType, Name>,
		cb: AccountBypassFn<StructType, Name>
	) {
		const listener = new AccountBypass(action, struct, cb);
		AccountBypass.listeners.add(listener as any);
		return listener;
	}

	constructor(
		public readonly action: Action,
		public readonly struct: Struct<StructType, Name>,
		public readonly cb: AccountBypassFn<StructType, Name>
	) {}

	run(
		account: Account.AccountData,
		data: StructData<StructType, Name> | DataVersion<StructType, Name>
	) {
		return attemptAsync(async () => {
			return this.cb(account, data);
		});
	}
}

export class ActionBypass<Action extends Actions, StructType extends Blank, Name extends string> {
	public static readonly listeners = new Set<ActionBypass<Actions, any, string>>();

	public static on<Action extends Actions, StructType extends Blank, Name extends string>(
		action: Action,
		struct: Struct<StructType, Name>,
		cb: BypassFn<Action, StructType, ReadTypes>
	) {
		const listener = new ActionBypass(action, struct, cb);
		ActionBypass.listeners.add(listener as any);
		return listener;
	}

	public static account = AccountBypass.on.bind(AccountBypass);

	constructor(
		public readonly action: Action,
		public readonly struct: Struct<StructType, Name>,
		public readonly cb: BypassFn<Action, StructType, ReadTypes>
	) {}

	public readonly exceptions = new Set<BypassException<Action, StructType, ReadTypes>>();

	except(cb: BypassException<Action, StructType, ReadTypes>) {
		this.exceptions.add(cb);
		return this;
	}

	async run(request: RequestEvent) {
		return attemptAsync(async () => {
			const res = await request.request.json();

			for (const exception of this.exceptions) {
				if (await exception(request, res)) {
					return true;
				}
			}

			return this.cb(request, res);
		});
	}

	async runWithAccount(
		account: Account.AccountData,
		data: StructData<StructType, Name> | DataVersion<StructType, Name>
	) {
		return attemptAsync(async () => {
			return Array.from(AccountBypass.listeners).some(async (b) =>
				b.run(account, data as any).unwrap()
			);
		});
	}
}

type AccountBlockFn = (account: Account.AccountData) => boolean | Promise<boolean>;

class AccountBlock<Action extends Actions, StructType extends Blank, Name extends string> {
	public static readonly listeners = new Set<AccountBlock<Actions, any, string>>();

	public static on<Action extends Actions, StructType extends Blank, Name extends string>(
		action: Action,
		struct: Struct<StructType, Name>,
		cb: AccountBlockFn
	) {
		const listener = new AccountBlock(action, struct, cb);
		AccountBlock.listeners.add(listener as any);
		return listener;
	}

	constructor(
		public readonly action: Action,
		public readonly struct: Struct<StructType, Name>,
		public readonly cb: AccountBlockFn
	) {}

	run(account: Account.AccountData) {
		return attemptAsync(async () => {
			return this.cb(account);
		});
	}
}

export type BlockCB<Action extends Actions, StructType extends Blank, _Name extends string> = (
	request: RequestEvent,
	action: Action,
	data: _ActionDataType<Action, StructType, ReadTypes>
) => boolean | Promise<boolean>;

export class Block<Action extends Actions, StructType extends Blank, Name extends string> {
	public static readonly blocks = new Set<Block<Actions, any, string>>();

	public static on<Action extends Actions, StructType extends Blank, Name extends string>(
		action: Action,
		struct: Struct<StructType, Name>,
		cb: BlockCB<Action, StructType, Name>
	) {
		const block = new Block(action, struct, cb);
		Block.blocks.add(block as any);
		return block;
	}

	public static account = AccountBlock.on.bind(AccountBlock);

	constructor(
		public readonly action: Action,
		public readonly struct: Struct<StructType, Name>,
		public readonly cb: BlockCB<Action, StructType, Name>
	) {}

	public run(
		request: RequestEvent,
		action: Action,
		data: _ActionDataType<Action, StructType, ReadTypes>
	) {
		return attemptAsync(async () => {
			return this.cb(request, action, data);
		});
	}

	public async runWithAccount(account: Account.AccountData) {
		return attemptAsync(async () => {
			return Array.from(AccountBlock.listeners).some(async (b) => b.run(account).unwrap());
		});
	}

	public exceptions = new Set<BlockCB<Action, StructType, Name>>();

	except(cb: BlockCB<Action, StructType, Name>) {
		this.exceptions.add(cb);
		return this;
	}
}
