import { defineConfig } from 'drizzle-kit';
import { config } from './src/lib/server/utils/env';

function getDatabaseCredentials() {
	const { database } = config;

	if (database.connectionUrl) {
		return { url: database.connectionUrl };
	}

	// Zod validation ensures all required fields exist if connectionUrl is not provided
	if (!database.host || !database.port || !database.user || !database.pass || !database.name) {
		throw new Error(
			'Database configuration invalid: either connectionUrl or all of (host, port, user, pass, name) must be provided'
		);
	}

	return {
		host: database.host,
		port: database.port,
		user: database.user,
		password: database.pass,
		database: database.name,
		ssl: false
	};
}

export default defineConfig({
	schema: './src/lib/server/structs/*.ts',
	dbCredentials: getDatabaseCredentials(),
	verbose: true,
	strict: true,
	dialect: 'postgresql',
	out: './drizzle'
});
