import { command, getRequestEvent, query } from "$app/server";
import z from "zod";
import { getAccount, getSession } from "./index.remote";
import { Analytics } from "$lib/server/structs/analytics";
import { error } from "@sveltejs/kit";
import { signFingerprint } from "$lib/server/utils/fingerprint";
import { domain } from "$lib/server/utils/env";

export const myLinks = query(z.object({
    limit: z.number().min(1).max(100).default(10),
    page: z.number().min(0).default(0),
}), async (data) => {
    const account = await getAccount();
    if (!account) {
        return error(401, 'Unauthorized');
    }

    return (await Analytics.getAccountLinks(account, {
        limit: data.limit,
        offset: data.page * data.limit,
    }).unwrap()).map(link => link.safe());
});

export const getCount = query(async () => {
    const account = await getAccount();
    if (account) {
        return Analytics.getCount(account).unwrap();
    } else {
        const session = await getSession();
        const links = await Analytics.Links.fromProperty('session', session.id, {
            type: 'all',
        }).unwrap();
        return links.filter((v, i, a) => a.findIndex((v2) => v2.data.url === v.data.url) === i).length;
    }
});

export const fingerprint = command(z.object({
    fingerprint: z.string(),
}), async (data) => {
    const session = await getSession();
    await session.update({
        fingerprint: data.fingerprint,
    }).unwrap();
    const event = getRequestEvent();
    event.cookies.set(
        'fpid',
        await signFingerprint({
            fingerprint: data.fingerprint,
            userAgent: event.request.headers.get('user-agent') || '',
            language: event.request.headers.get('accept-language') || ''
        }).unwrap(),
        {
            httpOnly: true,
            domain: domain({
                port: false,
                protocol: false,
            }) ?? '',
            path: '/'
        }
    );
});