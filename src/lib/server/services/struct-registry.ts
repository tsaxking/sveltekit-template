/**
 * @fileoverview Struct registry and permission overrides.
 *
 * Registers server structs and configures block/bypass handlers by action.
 *
 * @example
 * import registry from '$lib/server/services/struct-registry';
 * registry.register(MyStruct).block(DataAction.Delete);
 */
import type { DataAction, PropertyAction } from '../../types/struct';
import { DataVersion, Struct, StructData, type Blank } from 'drizzle-struct';
import type { Account } from '../structs/account';
import { attempt } from 'ts-utils';

type Fn<T extends Blank> = (
	account: Account.AccountData,
	item?: StructData<T> | DataVersion<T>
) => boolean;

class StructRegistry<T extends Blank> {
	constructor(public readonly struct: Struct<T>) {}

	private readonly bypasses = new Map<DataAction | PropertyAction, Fn<T> | true>();

	bypass(action: DataAction | PropertyAction, fn?: Fn<T>) {
		if (fn) this.bypasses.set(action, fn);
		else this.bypasses.set(action, true);
		return this;
	}

	isBypassed(
		action: DataAction | PropertyAction,
		account: Account.AccountData,
		item?: StructData<T> | DataVersion<T>
	) {
		return attempt(() => {
			const fn = this.bypasses.get(action);
			if (typeof fn === 'function') {
				return fn(account, item);
			}
			if (fn === true) return true;
			return false;
		});
	}

	private readonly blocks = new Map<DataAction | PropertyAction, Fn<T> | true>();

	block(action: DataAction | PropertyAction, fn?: Fn<T>) {
		if (fn) this.blocks.set(action, fn);
		else this.blocks.set(action, true);
		return this;
	}

	isBlocked(
		action: DataAction | PropertyAction,
		account: Account.AccountData,
		item?: StructData<T> | DataVersion<T>
	) {
		return attempt(() => {
			const fn = this.blocks.get(action);
			if (typeof fn === 'function') {
				return fn(account, item);
			}
			if (fn === true) return true;
			return false;
		});
	}
}

/**
 * Registry for all structs available to the front end.
 */
export default new (class FrontEndStructRegistry {
	/**
	 * Internal map of struct name to struct definition.
	 */
	private readonly structs = new Map<string, StructRegistry<Blank>>();

	/**
	 * Register a struct by its name.
	 *
	 * @param {Struct} struct - The struct definition to register.
	 */
	register(struct: Struct) {
		const r = new StructRegistry(struct);
		this.structs.set(struct.name, r);
		return r;
	}

	/**
	 * Get a registered struct by name.
	 *
	 * @param {string} name - The struct name.
	 * @returns The registered struct, if present.
	 */
	get(name: string): StructRegistry<Blank> | undefined {
		return this.structs.get(name);
	}

	/**
	 * Check if a struct is registered.
	 *
	 * @param {string} name - The struct name.
	 * @returns True when the struct is registered.
	 */
	has(name: string): boolean {
		return this.structs.has(name);
	}
})();
