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
 *
 * @property {string} host - Database host.
 * @property {number} port - Database port.
 * @property {string} database - Database name.
 * @property {string} username - Database user.
 * @property {string} password - Database password.
 */
export const client = postgres({
	host: config.database.host,
	port: config.database.port,
	database: config.database.name,
	username: config.database.user,
	password: config.database.pass
});
/**
 * Drizzle ORM instance bound to the Postgres client.
 */
export const DB = drizzle(client);
