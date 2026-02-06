/**
 * @fileoverview Account RPC layer for shared client/server access.
 *
 * Each `query()`/`command()` curries a handler with a Zod schema that validates
 * inputs at the boundary, enabling type-safe and permission-safe usage on both
 * client and server.
 *
 * @example
 * import * as accountRemote from '$lib/remotes/account.remote';
 * const results = await accountRemote.search({ query: 'alice', limit: 10, page: 0 });
 */
import { command, query } from '$app/server';
import z from 'zod';
import { Account } from '$lib/server/structs/account';
import { getAccount, getSession, isLoggedIn } from './index.remote';
import { Session } from '$lib/server/structs/session';
import { error } from '@sveltejs/kit';

/**
 * Searches accounts by username or profile fields.
 *
 * @param {{ query: string; limit?: number; page?: number }} data - Search payload.
 */
export const search = query(
	z.object({
		query: z.string().min(1).max(255),
		limit: z.number().min(1).max(100).default(10),
		page: z.number().min(0).default(0)
	}),
	async (data) => {
		if (!(await isLoggedIn())) {
			return error(401, 'Unauthorized');
		}

		const res = await Account.searchAccounts(data.query, {
			type: 'array',
			limit: data.limit,
			offset: data.page * data.limit
		});

		if (res.isOk()) {
			return res.value.map((a) => a.safe());
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);

/**
 * Returns the current account or 401 if not signed in.
 */
export const self = query(async () => {
	const a = await getAccount();
	if (!a) return error(401, 'Unauthorized');
	return a.safe();
});

/**
 * Checks whether a username already exists.
 *
 * @param {{ username: string }} data - Username payload.
 */
export const usernameExists = query(
	z.object({
		username: z.string().min(3).max(32)
	}),
	async (data) => {
		const count = await Account.Account.get(
			{ username: data.username },
			{
				type: 'count'
			}
		);
		if (count.isOk()) {
			return count.value > 0;
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);

/**
 * Returns unread notifications for the current account.
 *
 * @param {{ page?: number; limit?: number }} data - Paging payload.
 */
export const getOwnNotifs = query(
	z.object({
		page: z.number().min(0).default(0),
		limit: z.number().min(1).max(100).default(10)
	}),
	async ({ page, limit }) => {
		const account = await getAccount();
		if (!account) return error(401, 'Unauthorized');

		const res = await Account.AccountNotification.get(
			{
				accountId: account.id,
				read: false
			},
			{
				type: 'array',
				limit: limit,
				offset: page * limit
			}
		);

		if (res.isOk()) {
			return res.value.map((n) => n.safe());
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);

/**
 * Signs out the current session.
 */
export const signOut = command(async () => {
	const session = await getSession();
	const res = await Session.signOut(session);
	if (res.isOk()) {
		return true;
	} else {
		return error(500, 'Internal Server Error');
	}
});

/**
 * Returns all notifications for the current account.
 *
 * @param {{ page?: number; limit?: number }} data - Paging payload.
 */
export const getNotifications = query(
	z.object({
		limit: z.number().min(1).max(100).default(10),
		page: z.number().min(0).default(0)
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) return error(401, 'Unauthorized');

		const res = await Account.AccountNotification.get(
			{
				accountId: account.id
			},
			{
				type: 'array',
				limit: data.limit,
				offset: data.page * data.limit
			}
		);

		if (res.isOk()) {
			return res.value.map((n) => n.safe());
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);
