import { sql } from 'drizzle-orm';
import { DB } from '../src/lib/server/db';
import { z } from 'zod';

const updateTable = async (tableName: string) => {
	const data = await DB.execute(sql`
        SELECT id, created, updated FROM ${sql.identifier(tableName)};
    `);

	await DB.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)}
        DROP COLUMN IF EXISTS updated,
        DROP COLUMN IF EXISTS created;
    `);

	await DB.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)}
        ADD COLUMN created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ADD COLUMN updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    `);

	await Promise.all(
		data.map(async (row) => {
			await DB.execute(sql`
            UPDATE ${sql.identifier(tableName)}
            SET created = ${new Date(String(row.created)).toISOString()},
                updated = ${new Date(String(row.updated)).toISOString()}
            WHERE id = ${row.id};
        `);
		})
	);
};

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

	const res = await Promise.all(typed.map((t) => updateTable(t.table_name)));
};
