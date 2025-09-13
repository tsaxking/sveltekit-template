import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { str, num } from '../utils/env';

export const client = postgres({
	host: str('DB_HOST', true),
	port: num('DB_PORT', true),
	database: str('DB_NAME', true),
	username: str('DB_USER', true),
	password: str('DB_PASS', true)
});
export const DB = drizzle(client);
