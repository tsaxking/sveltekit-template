import { text } from "drizzle-orm/pg-core";
import { Struct } from "drizzle-struct/back-end";

export namespace Logs {
    export const log = new Struct({
        name: 'logs',
        structure: {
            dataId: text('data_id').notNull(),
            accountId: text('account_id').notNull(),
            type: text('type').notNull(),
            message: text('message').notNull(),
        },
    });
}

export const _logTable = Logs.log.table;