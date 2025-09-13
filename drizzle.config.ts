import { defineConfig } from 'drizzle-kit';
import { str, num } from './src/lib/server/utils/env';

export default defineConfig({
	schema: './src/lib/server/structs/*.ts',

	dbCredentials: {
		host: str('DB_HOST', true),
		port: num('DB_PORT', true),
		database: str('DB_NAME', true),
		user: str('DB_USER', true),
		password: str('DB_PASS', true),
		ssl: false
	},

	verbose: true,
	strict: true,
	dialect: 'postgresql',
	out: './drizzle'
});
