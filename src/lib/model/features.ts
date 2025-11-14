import { browser } from "$app/environment";
import { sse } from "$lib/services/sse";
import { Struct } from "$lib/services/struct";
import z from "zod";

export namespace Features {
    export const Alert = new Struct({
        name: 'feature_alert',
        structure: {
            accountId: 'string',
            feature: 'string',
        },
        socket: sse,
        browser,
    });

    export const getUnread = () => {
        return Alert.send('unread', {},z.array(z.string()), {
            cache: {
                expires: new Date(Date.now() + 1000 * 60 * 60),
            },
        });
    };
}