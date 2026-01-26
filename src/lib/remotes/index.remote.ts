import { getRequestEvent, query } from "$app/server";
import { Account } from "$lib/server/structs/account";

export const isAdmin = query(async () => {
    const event = getRequestEvent();
    if (!event.locals.account) return false;
    return Account.isAdmin(event.locals.account).unwrap();
});

export const isLoggedIn = query(async () => {
    const event = getRequestEvent();
    return !!event.locals.account;
});

export const getAccount = query(async () => {
    const event = getRequestEvent();
    return event.locals.account || null;
});

export const getSession = query(async () => {
    const event = getRequestEvent();
    return event.locals.session;
});

export const getSSE = query(async () => {
    const event = getRequestEvent();
    return event.locals.sse;
});