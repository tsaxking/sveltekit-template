// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Account } from '$lib/server/structs/account';
import type { Session } from '$lib/server/structs/session';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			account?: Account.AccountData | undefined;
			session: Session.SessionData;
			start: number;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	const __APP_ENV__: {
		name: string;
		indexed_db: {
			enabled: boolean;
			db_name: string;
			version: number;
			debug: boolean;
		};
		struct_cache: {
			enabled: boolean;
			default_expiry_minutes: number;
			cleanup_interval_minutes: number;
			debug: boolean;
		};
	};
}

export {};
