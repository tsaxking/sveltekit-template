/// <reference types="vitest/config" />
import { mdsvex } from 'mdsvex';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { email } from '@svelte-plugin/email/vite';
import { config } from 'dotenv';

config();

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	plugins: [
		email({
			dir: 'src/lib/emails'
		}),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: {
					async: true
				}
			},
			adapter: adapter(),
			preprocess: [
				mdsvex({
					extensions: ['.svx', '.md']
				})
			],
			extensions: ['.svelte', '.svx', '.md'],
			experimental: {
				remoteFunctions: true
			},
			alias: {
				$lib: 'src/lib'
			}
		})
	],
	ssr: {
		noExternal: ['node-html-parser', 'ts-utils', 'colors']
	},
	server: {
		port: Number(process.env.PORT),
		host: '0.0.0.0',
		allowedHosts: String(process.env.ALLOWED_HOSTS).split(','),
		watch: {
			ignored: [
				'**/node_modules/**',
				'**/.git/**',
				'**/dist/**',
				'**/build/**',
				'**/out/**',
				'**/coverage/**',
				'docs/**',
				'**/public/**',
				'**/.svelte-kit/**'
			]
		}
		//hmr: false,
	}
});
