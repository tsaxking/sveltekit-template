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
export const client = config.database.connectionUrl
	? postgres(config.database.connectionUrl)
	: postgres({
			host: config.database.host!,
			port: config.database.port!,
			database: config.database.name!,
			username: config.database.user!,
			password: config.database.pass!
		});
/**
 * Drizzle ORM instance bound to the Postgres client.
 */
export const DB = drizzle(client);
