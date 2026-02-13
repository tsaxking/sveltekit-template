import { defineConfig } from 'drizzle-kit';
import { config } from './src/lib/server/utils/env';

export default defineConfig({
	schema: './src/lib/server/structs/*.ts',

	dbCredentials: config.database.connectionUrl
		? {
				url: config.database.connectionUrl
			}
		: {
				host: config.database.host!,
				port: config.database.port!,
				user: config.database.user!,
				password: config.database.pass!,
				database: config.database.name!,
				ssl: false
			},

	verbose: true,
	strict: true,
	dialect: 'postgresql',
	out: './drizzle'
});
