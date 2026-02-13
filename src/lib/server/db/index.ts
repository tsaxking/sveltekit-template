/**
 * @fileoverview PostgreSQL client and Drizzle ORM instance.
 *
 * @example
 * import { DB } from '$lib/server/db';
 * const rows = await DB.select().from(myTable);
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../utils/env';

/**
 * Postgres client configured from server env.
 * Supports both connection URL (e.g., Supabase) and individual parameters.
 *
 * @property {string} host - Database host (when using individual params).
 * @property {number} port - Database port (when using individual params).
 * @property {string} database - Database name (when using individual params).
 * @property {string} username - Database user (when using individual params).
 * @property {string} password - Database password (when using individual params).
 */
function createPostgresClient() {
	const { database } = config;

	if (database.connectionUrl) {
		return postgres(database.connectionUrl);
	}

	// Zod validation ensures all required fields exist if connectionUrl is not provided
	if (!database.host || !database.port || !database.user || !database.pass || !database.name) {
		throw new Error(
			'Database configuration invalid: either connectionUrl or all of (host, port, user, pass, name) must be provided'
		);
	}

	return postgres({
		host: database.host,
		port: database.port,
		database: database.name,
		username: database.user,
		password: database.pass
	});
}

export const client = createPostgresClient();
/**
 * Drizzle ORM instance bound to the Postgres client.
 */
export const DB = drizzle(client);
