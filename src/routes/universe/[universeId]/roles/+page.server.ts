import { Universes } from '$lib/server/structs/universe.js';
import { fail, redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { Session } from '$lib/server/structs/session.js';
import { Permissions } from '$lib/server/structs/permissions.js';

export const load = async (event) => {
	if (!event.locals.account)
		throw redirect(ServerCode.permanentRedirect, `/status/404?${event.request.url}`);

	const { universeId } = event.params;

	const universe = await Universes.Universe.fromId(universeId);
	if (universe.isErr()) {
		console.error(universe.error);
		throw fail(ServerCode.internalServerError);
	}

	if (!universe.value)
		throw redirect(ServerCode.permanentRedirect, `/status/404?${event.request.url}`);

	const roles = await Universes.memberRoles(event.locals.account, universe.value);
	if (roles.isErr()) {
		console.error(roles.error);
		throw fail(ServerCode.internalServerError);
	}

	if (!(await Permissions.canAccess(roles.value, 'roles', universe.value)).unwrap()) {
		throw redirect(ServerCode.permanentRedirect, `/status/404?${event.request.url}`);
	}

	return {
		universe: universe.value.safe()
	};
};
