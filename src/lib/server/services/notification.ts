import { type Blank, Struct } from 'drizzle-struct/back-end';
import type { DataAction, PropertyAction } from 'drizzle-struct/types';
import { Account } from '../structs/account';

export namespace NotificationService {
	class Action {}

	class Service<T extends Blank = Blank, N extends string = string> {
		constructor(public readonly struct: Struct<T, N>) {}

		on(event: PropertyAction | DataAction) {}
	}

	const services = new Map<string, Service>();

	export const createService = <T extends Blank, N extends string>(struct: Struct<T, N>) => {
		const key = struct.data.name;
		if (services.has(key)) {
			throw new Error(`Service for struct ${key} already exists`);
		}
		const service = new Service<T, N>(struct);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		services.set(key, service as any);
		return service;
	};
}

NotificationService.createService(Account.Account);
