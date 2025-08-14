import { sql } from 'drizzle-orm';
import { DB } from '../src/lib/server/db';
import { z } from 'zod';

const updateTable = async (tableName: string, otherCols: string[]) => {
	// Get all columns for the table
	const columns = await DB.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${tableName};
    `);

	// Only keep otherCols that actually exist in the table
	otherCols = otherCols.filter((oc) => columns.some((c) => c.column_name === oc));

	const isVersionTable = columns.some((c) => c.column_name === 'vh_created');

	// Build the list of columns to select (always id, created, updated, optionally vh_created, plus any otherCols)
	const baseCols = ['id', 'created', 'updated'];
	if (isVersionTable) baseCols.push('vh_created');
	const selectCols = [...baseCols, ...otherCols.filter((col) => !baseCols.includes(col))];

	// Fetch all data to preserve
	const data = await DB.execute(sql`
        SELECT ${sql.raw(selectCols.join(', '))} FROM ${sql.identifier(tableName)};
    `);

	// Drop old timestamp columns (and vh_created if present)
	const dropCols = ['updated', 'created'];
	if (isVersionTable) dropCols.push('vh_created');
	await DB.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)}
        ${sql.raw(dropCols.map((col) => `DROP COLUMN IF EXISTS "${col}"`).join(', '))};
    `);

	// Add new timestamp columns
	await DB.execute(sql`
        ALTER TABLE ${sql.identifier(tableName)}
        ADD COLUMN created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        ADD COLUMN updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        ${isVersionTable ? ', ADD COLUMN vh_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()' : ''};
    `);

	// Restore all data (created, updated, vh_created, and any otherCols)
	await Promise.all(
		data.map(async (row: Record<string, unknown>) => {
			// Build SET clause for all columns to restore using parameter substitution
			let c = new Date(String(row.created));
			if (c.toString() === 'Invalid Date') {
				c = new Date();
			}
			let u = new Date(String(row.updated));
			if (u.toString() === 'Invalid Date') {
				u = new Date();
			}
			const setFragments = [sql`created = ${c.toISOString()}`, sql`updated = ${u.toISOString()}`];
			if (isVersionTable) {
				let d = new Date(String(row.vh_created));
				if (d.toString() === 'Invalid Date') {
					d = new Date();
				}
				setFragments.push(sql`vh_created = ${d.toISOString()}`);
			}
			for (const col of otherCols) {
				if (row[col] !== undefined) {
					setFragments.push(sql`${sql.identifier(col)} = ${row[col]}`);
				}
			}
			await DB.execute(sql`
                UPDATE ${sql.identifier(tableName)}
                SET ${sql.join(setFragments, sql`, `)}
                WHERE id = ${row.id};
            `);
		})
	);
};

export default async (...otherCols: string[]) => {
	const tableCols: [string, string][] = otherCols.map((col) => {
		const [table, column] = col.split(':');
		return [table, column];
	});
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

	return await Promise.all(
		typed.map((t) =>
			updateTable(
				t.table_name,
				tableCols.filter((tc) => tc[0] === t.table_name).map((tc) => tc[1])
			)
		)
	);
};
