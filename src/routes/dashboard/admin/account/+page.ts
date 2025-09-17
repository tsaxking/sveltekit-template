import { Account } from '$lib/model/account.js';
import { Permissions } from '$lib/model/permissions.js';

export const load = (event) => {
	return {
		accounts: event.data.accounts.map((a) => ({
			account: Account.Account.Generator(a.account),
			roles: a.roles.map((r) => Permissions.Role.Generator(r))
		})),
		total: event.data.total,
		page: event.data.page,
		limit: event.data.limit
	};
};
