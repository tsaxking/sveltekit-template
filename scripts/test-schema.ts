import { globalCols, Struct } from 'drizzle-struct';
import { openStructs } from '../cli/struct';
import { DB, client } from '../src/lib/server/db';
import { fromCamelCase, fromSnakeCase, toSnakeCase, toCamelCase } from 'ts-utils/text';
import terminal from '../src/lib/server/utils/terminal';

export default async (build: 'true' | 'false' = 'true') => {
	if (build === 'true') {
		await openStructs().unwrap();
		await Struct.buildAll(DB);
	}

	const structs = Array.from(Struct.structs.values());

	let success = true;

	for (const s of structs) {
		const tableName = s.name;

		// 1. Get actual DB schema
		const dbCols = await client`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
        `;

		const dbColMap = new Map<string, { data_type: string; is_nullable: string }>();
		for (const row of dbCols) {
			dbColMap.set(row.column_name, {
				data_type: row.data_type,
				is_nullable: row.is_nullable
			});
		}

		// 2. Get Drizzle-defined schema
		const columns = { ...s.data.structure, ...globalCols };

		for (const [name, col] of Object.entries(columns)) {
			const expectedPgType = col.constructor.name
				.replace('Pg', '')
				.replace('Builder', '')
				.toLowerCase();

			// column in program but not in DB
			const actual = dbColMap.get(toSnakeCase(fromCamelCase(name)));
			if (!actual) {
				terminal.warn(`[MISSING COLUMN] ${tableName}.${name} not found in DB`);
				success = false;
				continue;
			}

			if (actual.data_type === 'timestamp with time zone' && expectedPgType === 'timestamp') {
				// all is good, we allow timestamp to match timestamp with time zone
				continue;
			}

			// You may want to normalize here to match 'character varying' with 'varchar' etc
			const matchesType = actual.data_type === expectedPgType;
			// const matchesNull = (actual.is_nullable === 'YES') === nullable;

			if (!matchesType) {
				terminal.warn(
					`[SCHEMA MISMATCH] ${tableName}.${name}: expected ${expectedPgType}, got ${actual.data_type}`
				);
				success = false;
			}
		}

		// check if there are extra columns in DB not defined in program
		for (const [name, _actual] of dbColMap.entries()) {
			if (!(toCamelCase(fromSnakeCase(name)) in columns)) {
				terminal.warn(`[EXTRA COLUMN] ${tableName}.${name} exists in DB but not in program`);
				success = false;
			}
		}
	}

	if (!success) {
		terminal.error(
			'Schema test failed. Please check the logs for details. You may need to push your schema changes to the database.'
		);
		process.exit(1);
	}

	console.log('Schema test passed successfully!');
	return true;
};
