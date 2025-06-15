import { sql } from 'drizzle-orm';
import { DB } from '../src/lib/server/db';
import { z } from 'zod';

export default async () => {
	// get all tables in the database
	const result = await DB.execute(sql`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public';
        `);

	const typed = z
		.array(
			z.object({
				table_name: z.string()
			})
		)
		.parse(result);

	const res = await Promise.all(
		typed.map(async (t) => {
			return DB.execute(sql`
            ALTER TABLE ${sql.identifier(t.table_name)}
            DROP COLUMN IF EXISTS universe;
        `);
		})
	);

	const res2 = await DB.execute(sql`
        DROP TABLE IF EXISTS universes;
        DROP TABLE IF EXISTS universe_invite;
    `);

	console.log(res, res2);
};
