import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { config } from './src/lib/server/utils/env';
export default defineConfig({
	optimizeDeps: {
		include: ['ts-utils/**', 'drizzle-struct/**']
	},
	plugins: [sveltekit()],

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		watch: process.argv.includes('watch')
	},
	ssr: {
		noExternal: ['node-html-parser']
	},
	server: {
		port: config.network.port,
		host: '0.0.0.0',
		allowedHosts: ['dev.tsaxking.com'],
		watch: {
			ignored: ['**/src/lib/types/**']
		}
	},
	define: {
		__APP_ENV__: JSON.stringify({
			environment: config.environment,
			name: config.app_name,
			indexed_db: config.indexed_db,
			struct_cache: config.struct_cache,
			struct_batching: config.struct_batching
		})
	}
});
