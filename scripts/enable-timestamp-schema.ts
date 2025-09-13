/* eslint-disable @typescript-eslint/no-explicit-any */
import { sql } from 'drizzle-orm';
import { DB } from '../src/lib/server/db';
import { z } from 'zod';

const BATCH_SIZE = 1000;

const updateTable = async (tableName: string) => {
	// find if this table has vh_created
	const columns = await DB.execute(sql`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_name = ${tableName};
	`);

	// Depending on your DB driver, check rows property
	const columnRows = Array.isArray(columns) ? columns : ((columns as any).rows ?? []);
	const isVersionTable = columnRows.some((c: any) => c.column_name === 'vh_created');

	// Drop and re-add the timestamp columns
	await DB.execute(sql`
		ALTER TABLE ${sql.identifier(tableName)}
		DROP COLUMN IF EXISTS updated,
		DROP COLUMN IF EXISTS created,
		DROP COLUMN IF EXISTS vh_created;
	`);

	await DB.execute(sql`
		ALTER TABLE ${sql.identifier(tableName)}
		ADD COLUMN created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		ADD COLUMN updated TIMESTAMPTZ NOT NULL DEFAULT NOW();
	`);

	if (isVersionTable) {
		await DB.execute(sql`
			ALTER TABLE ${sql.identifier(tableName)}
			ADD COLUMN vh_created TIMESTAMPTZ NOT NULL DEFAULT NOW();
		`);
	}

	// Stream/batch rows
	let offset = 0;
	while (true) {
		const rows: any[] = await DB.execute(sql`
			SELECT id, created, updated ${isVersionTable ? sql`, vh_created` : sql``}
			FROM ${sql.identifier(tableName)}
			ORDER BY id
			LIMIT ${BATCH_SIZE} OFFSET ${offset};
		`);

		const typedRows = Array.isArray(rows) ? rows : ((rows as any).rows ?? []);
		if (typedRows.length === 0) break;

		for (const row of typedRows) {
			await DB.execute(sql`
				UPDATE ${sql.identifier(tableName)}
				SET created = ${row.created ? new Date(String(row.created)).toISOString() : new Date().toISOString()},
					updated = ${row.updated ? new Date(String(row.updated)).toISOString() : new Date().toISOString()}
				WHERE id = ${row.id};
			`);

			if (isVersionTable && row.vh_created) {
				await DB.execute(sql`
					UPDATE ${sql.identifier(tableName)}
					SET vh_created = ${new Date(String(row.vh_created)).toISOString()}
					WHERE id = ${row.id};
				`);
			}
		}

		offset += BATCH_SIZE;
	}
};

export default async () => {
	const result = await DB.execute(sql`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public';
	`);

	const typed = z
		.array(z.object({ table_name: z.string() }))
		.parse(Array.isArray(result) ? result : ((result as any).rows ?? []));

	for (const t of typed) {
		await updateTable(t.table_name);
	}
};
