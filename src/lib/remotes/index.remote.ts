/**
 * @fileoverview Base RPC helpers for session/account context.
 *
 * These remotes provide safe access to server-side locals and are used as
 * building blocks for other remotes.
 *
 * @example
 * import * as baseRemote from '$lib/remotes/index.remote';
 * const isLoggedIn = await baseRemote.isLoggedIn();
 */
import { getRequestEvent, query } from '$app/server';
import { Account } from '$lib/server/structs/account';
import { error } from '@sveltejs/kit';

/**
 * Returns true when the current account is an administrator.
 */
export const isAdmin = query(async () => {
	const event = getRequestEvent();
	if (!event.locals.account) return false;
	const res = await Account.isAdmin(event.locals.account);
	if (res.isErr()) {
		return error(500, 'Internal Server Error');
	} else {
		return res.value;
	}
});

/**
 * Returns true when a user is signed in.
 */
export const isLoggedIn = query(async () => {
	const event = getRequestEvent();
	return !!event.locals.account;
});

/**
 * Returns the current account or null.
 */
export const getAccount = query(async () => {
	const event = getRequestEvent();
	return event.locals.account || null;
});

/**
 * Returns the current session data.
 */
export const getSession = query(async () => {
	const event = getRequestEvent();
	return event.locals.session;
});

/**
 * Returns the current SSE connection if available.
 */
export const getSSE = query(async () => {
	const event = getRequestEvent();
	return event.locals.sse;
});
