import { sql } from 'drizzle-orm';
import { DB } from '../src/lib/server/db';

export default async () => {
	await DB.execute(sql`
        DELETE FROM session;
    `);
};
