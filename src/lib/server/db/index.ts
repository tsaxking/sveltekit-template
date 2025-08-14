import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
config();
if (!process.env.DB_HOST) console.warn('DB_HOST is not set');
if (!process.env.DB_PORT) console.warn('DB_PORT is not set');
if (!process.env.DB_NAME) console.warn('DB_NAME is not set');
if (!process.env.DB_USER) console.warn('DB_USER is not set');
if (!process.env.DB_PASS) console.warn('DB_PASS is not set');

export const client = postgres({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || '5432'),
	database: process.env.DB_NAME || '',
	username: process.env.DB_USER || '',
	password: process.env.DB_PASS || ''
});
export const DB = drizzle(client);
