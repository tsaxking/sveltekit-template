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
}

export {};
