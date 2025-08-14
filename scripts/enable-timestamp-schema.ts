import { sql } from 'drizzle-orm';
import { DB } from '../src/lib/server/db';
import { z } from 'zod';

const updateTable = async (tableName: string) => {
	const columns = await DB.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${tableName};  
    `);

	const isVersionTable = columns.find((c) => c.column_name === 'vh_created');

	const data = isVersionTable
		? await DB.execute(sql`
            SELECT id, vh_created, created, updated FROM ${sql.identifier(tableName)};
        `)
		: await DB.execute(sql`
        SELECT id, created, updated FROM ${sql.identifier(tableName)};
    `);

	await DB.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)}
        DROP COLUMN IF EXISTS updated,
        DROP COLUMN IF EXISTS created;
        DROP COLUMN IF EXISTS vh_created;
    `);

	await DB.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)}
        ADD COLUMN created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ADD COLUMN updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    `);

	if (isVersionTable) {
		await DB.execute(sql`
            ALTER TABLE ${sql.identifier(tableName)}
            ADD COLUMN vh_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
        `);
	}

	await Promise.all(
		data.map(async (row) => {
			await DB.execute(sql`
                UPDATE ${sql.identifier(tableName)}
                SET created = ${new Date(String(row.created)).toISOString()},
                    updated = ${new Date(String(row.updated)).toISOString()}
                WHERE id = ${row.id};
            `);

			if (isVersionTable) {
				await DB.execute(sql`
                    UPDATE ${sql.identifier(tableName)}
                    SET vh_created = ${new Date(String(row.vh_created)).toISOString()}
                    WHERE id = ${row.id};
                `);
			}
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
