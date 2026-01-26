import { command, query } from "$app/server";
import z from "zod";
import { Account } from "$lib/server/structs/account";
import { getAccount, getSession, isLoggedIn } from "./index.remote";
import { Session } from "$lib/server/structs/session";
import { error } from "@sveltejs/kit";

export const search = query(z.object({
    query: z.string().min(1).max(255),
    limit: z.number().min(1).max(100).default(10),
    page: z.number().min(0).default(0),
}), async (data) => {
    if (!await isLoggedIn()) {
        return error(401, 'Unauthorized');
    }

    return (await Account.searchAccounts(data.query, {
        type: 'array',
        limit: data.limit,
        offset: data.page * data.limit,
    }).unwrap()).map(a => a.safe());
});

export const self = query(async () => {
    const a = await getAccount();
    if (!a) return error(401, 'Unauthorized');
    return a.safe();
});

export const usernameExists = query(z.object({
    username: z.string().min(3).max(32),
}), async (data) => {
    const account = await Account.Account.fromProperty('username', data.username, {
        type: 'count',
    }).unwrap();

    return account > 0;
});


export const getOwnNotifs = query(z.object({
    page: z.number().min(0).default(0),
    limit: z.number().min(1).max(100).default(10),
}), async ({ page, limit }) => {
    const account = await getAccount();
    if (!account) return error(401, 'Unauthorized');

    return (await Account.AccountNotification.get({
        accountId: account.id,
        read: false,
    }, {
        type: 'array',
        limit: limit,
        offset: page * limit,
    })).unwrap().map(n => n.safe());
});

export const signOut = command(async () => {
    const session = await getSession();
    await Session.signOut(session).unwrap();
});