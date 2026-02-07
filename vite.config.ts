import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { config } from './src/lib/server/utils/env';
import typescript from '@rollup/plugin-typescript';
import Macros from 'ts-macros';

const isTest = Boolean(process.env.VITEST);

export default defineConfig({
	optimizeDeps: {
		include: ['ts-utils/**', 'drizzle-struct/**']
	},
	plugins: [sveltekit(),
		typescript({
			transformers: {
				before: [
					{
						type: 'program',
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						factory: Macros as any,
					}
				]
			}
		})
	],
	resolve: isTest
		? {
				conditions: ['browser', 'svelte', 'import', 'default']
			}
		: undefined,

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		watch: process.argv.includes('watch'),
		environment: 'jsdom'
	},
	ssr: {
		noExternal: ['node-html-parser']
	},
	server: {
		port: config.network.port,
		host: '0.0.0.0',
		allowedHosts: ['dev.tsaxking.com']
	},
	define: {
		__APP_ENV__: JSON.stringify({
			environment: config.environment,
			name: config.app_name,
			indexed_db: config.indexed_db,
			struct_cache: config.struct_cache,
			struct_batching: config.struct_batching,
			sse: config.sse
		})
	}
});
