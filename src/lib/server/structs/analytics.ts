import { text } from "drizzle-orm/pg-core";
import { Struct } from "drizzle-struct/back-end";
import type { Account } from "./account";
import { attemptAsync } from "ts-utils/check";
import { DB } from "../db";
import { Session } from "./session";
import { eq } from "drizzle-orm";
import { z } from "zod";

export namespace Analytics {
    export const Links = new Struct({
        name: 'analytics_links',
        structure: {
            session: text('session').notNull(),
            url: text('url').notNull(),
        },
    });

    export type LinkData = typeof Links.sample;

    Links.queryListen('my-links', async (event, data) => {
        const account = event.locals.account;

        const parsed = z.object({
            offset: z.number(),
            limit: z.number(),
        }).safeParse(data);

        if (!parsed.success) {
            throw new Error('Invalid data');
        }

        if (!account) {
            const links = await Links.fromProperty('session', event.locals.session.id, {
                type: 'all',
            }).unwrap();
            const filtered = links.filter((v, i, a) => a.findIndex(v2 => v2.data.url === v.data.url) === i);
            const limited = filtered.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit);
            return limited;
        }

        return getAccountLinks(account, parsed.data).unwrap();
    });

    Links.sendListen('count', async (event) => {
        console.log('Received count');
        const account = event.locals.account;
        if (!account) {
            const links = await Links.fromProperty('session', event.locals.session.id, {
                type: 'all',
            }).unwrap();
            return links.filter((v, i, a) => a.findIndex(v2 => v2.data.url === v.data.url) === i).length;
        } else {
            return getCount(account).unwrap();
        }
    });

    export const getAccountLinks = (account: Account.AccountData, config: {
        limit: number;
        offset: number;
    }) => {
        return attemptAsync(async () => {
            // get all sessions for the account, then all the links for those sessions
            // all in one query
            const res = await DB.select()
                .from(Links.table)
                .innerJoin(Session.Session.table, eq(Session.Session.table.accountId, account.id))
                .where(eq(Session.Session.table.accountId, account.id));

            return res
                .filter((v, i, a) => a.findIndex(v2 => v2.analytics_links.url === v.analytics_links.url) === i)
                .slice(config.offset, config.offset + config.limit)
                .map(r => Links.Generator(r.analytics_links))
                .reverse();
        });
    };

    export const getCount = (account: Account.AccountData) => {
        return attemptAsync(async () => {
            const links = await getAccountLinks(account, {
                limit: Infinity,
                offset: 0,
            }).unwrap();
            return links.length;
        });
    }
}

export const _links = Analytics.Links.table;