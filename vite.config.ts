import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { config } from 'dotenv';
config();
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
		port: Number(process.env.PORT) || 5173,
		host: '0.0.0.0',
		allowedHosts: ['dev.tsaxking.com']
	}
});
