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

	// Rename old columns to temp columns if they exist
	await DB.execute(
		sql`
		ALTER TABLE ${sql.identifier(tableName)}
		RENAME COLUMN created TO created_old;
	`
	).catch(() => {});
	await DB.execute(
		sql`
		ALTER TABLE ${sql.identifier(tableName)}
		RENAME COLUMN updated TO updated_old;
	`
	).catch(() => {});
	if (isVersionTable) {
		await DB.execute(
			sql`
			ALTER TABLE ${sql.identifier(tableName)}
			RENAME COLUMN vh_created TO vh_created_old;
		`
		).catch(() => {});
	}

	// Add new columns
	await DB.execute(sql`
		ALTER TABLE ${sql.identifier(tableName)}
		ADD COLUMN IF NOT EXISTS created TIMESTAMPTZ,
		ADD COLUMN IF NOT EXISTS updated TIMESTAMPTZ;
	`);
	if (isVersionTable) {
		await DB.execute(sql`
			ALTER TABLE ${sql.identifier(tableName)}
			ADD COLUMN IF NOT EXISTS vh_created TIMESTAMPTZ;
		`);
	}

	// Paginate over rows and cast temp columns to timestamptz
	let offset = 0;
	while (true) {
		const rows: any[] = await DB.execute(sql`
			SELECT id, created_old, updated_old${isVersionTable ? sql`, vh_created_old` : sql``}
			FROM ${sql.identifier(tableName)}
			ORDER BY id
			LIMIT ${BATCH_SIZE} OFFSET ${offset};
		`);
		const typedRows = Array.isArray(rows) ? rows : ((rows as any).rows ?? []);
		if (typedRows.length === 0) break;

		for (const row of typedRows) {
			await DB.execute(sql`
				UPDATE ${sql.identifier(tableName)}
				SET created = ${row.created_old ? new Date(String(row.created_old)).toISOString() : null},
					updated = ${row.updated_old ? new Date(String(row.updated_old)).toISOString() : null}
				WHERE id = ${row.id};
			`);
			if (isVersionTable && row.vh_created_old) {
				await DB.execute(sql`
					UPDATE ${sql.identifier(tableName)}
					SET vh_created = ${new Date(String(row.vh_created_old)).toISOString()}
					WHERE id = ${row.id};
				`);
			}
		}
		offset += BATCH_SIZE;
	}

	// Drop temp columns after conversion
	await DB.execute(sql`
		ALTER TABLE ${sql.identifier(tableName)}
		DROP COLUMN IF EXISTS created_old,
		DROP COLUMN IF EXISTS updated_old;
	`);
	if (isVersionTable) {
		await DB.execute(sql`
			ALTER TABLE ${sql.identifier(tableName)}
			DROP COLUMN IF EXISTS vh_created_old;
		`);
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
