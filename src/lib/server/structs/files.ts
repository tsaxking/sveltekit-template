import { integer, text } from "drizzle-orm/pg-core";
import { Struct } from "drizzle-struct/back-end";
import { Redis } from "redis-utils";
import z from "zod";
import { proxyServer } from '../services/struct-proxy';

export namespace FileUploads {
    export const Tokens = new Struct({
        name: 'file_tokens',
        structure: {
            sessionId: text('session_id').notNull(),
            accountId: text('account_id').notNull(),
            fileType: text('file_type').notNull(),
            fileSize: integer('file_size').notNull(),
        },
        lifetime: 1000 * 60 * 60, // 1 hour
        proxyServer
    });

    export const init = (targetService: string) => {
        const service = Redis.createListeningService(targetService, {
            uploadSuccess: z.object({
                token: z.string(),
                fileId: z.string(),
            }),
            uploadError: z.object({
                token: z.string(),
                error: z.string(),
            }),
        });
    };
}

export const _tokens = FileUploads.Tokens.table;