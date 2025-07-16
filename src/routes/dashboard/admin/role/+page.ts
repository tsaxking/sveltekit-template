import { Permissions } from '$lib/model/permissions.js';
import { writable } from 'svelte/store';

export const load = (event) => {
	return {
		roles: writable(
			event.data.roles.map((r) => ({
				role: Permissions.Role.Generator(r.role),
				parent: r.parent ? Permissions.Role.Generator(r.parent) : undefined
			}))
		)
	};
};
