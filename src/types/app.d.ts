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
		cache: {
			enabled: boolean;
			version: number;
			static: {
				enabled: boolean;
				duration: number;
				limit: number;
				assets: string[];
			};
			api: {
				enabled: boolean;
				duration: number;
				limit: number;
				assets: string[];
			};
			pages: {
				enabled: boolean;
				duration: number;
				limit: number;
				assets: string[];
			}
		};
	};
}

export {};
