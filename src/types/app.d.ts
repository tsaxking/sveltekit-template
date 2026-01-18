// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Account } from '$lib/server/structs/account';
import type { Session } from '$lib/server/structs/session';
import type { RequestCache } from '$lib/server/services/permission-cache';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			account?: Account.AccountData | undefined;
			session: Session.SessionData;
			start: number;
			permissionCache: RequestCache;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	const __APP_ENV__: {
		environment: 'prod' | 'dev' | 'test' | 'staging';
		name: string;
		indexed_db: {
			enabled: boolean;
			db_name: string;
			version: number;
			debug: boolean;
			debounce_interval_ms: number;
		};
		struct_cache: {
			enabled: boolean;
			debug: boolean;
		};
		struct_batching: {
			enabled: boolean;
			interval: number;
			timeout: number;
			limit: number;
			batch_size: number;
			debug: boolean;
		};
	};
}

export {};
