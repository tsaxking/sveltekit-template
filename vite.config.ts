import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { num } from './src/lib/server/utils/env';
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
		port: num('PORT', true),
		host: '0.0.0.0',
		allowedHosts: ['dev.tsaxking.com']
	}
});
