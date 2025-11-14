import { text } from "drizzle-orm/pg-core";
import { Struct } from "drizzle-struct/back-end";
import { SendListener } from "../services/struct-listeners";
import z from "zod";
import { getFeatureList } from "$lib/utils/features";

export namespace Features {
    // Instead of having this populate for all read, should it poplate for all unread and delete once read?
    // This way new users won't have a bunch of "new" features
    
    export const Alert = new Struct({
        name: 'feature_alert',
        structure: {
            accountId: text('account_id').notNull(),
            feature: text('feature').notNull(),
        }
    });

    SendListener.on(
        'get_alerts', 
        Alert, 
        z.unknown(),
        async (event) => {
            if (!event.locals.account) return {
                success: false,
                message: 'Not logged in',
                data: [],
            };
            const features = await getFeatureList().unwrap();
            const all = await Alert.fromProperty('accountId', event.locals.account.data.id, {
                type: 'all',
            }).unwrap();
            const data = features.filter(f => !all.find(a => a.data.feature === f));
            return {
                success: true,
                data,
            }
        }
    );
}


export const _alert = Features.Alert.table;