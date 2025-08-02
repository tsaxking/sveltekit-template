import { attemptAsync } from 'ts-utils/check';
import { runTask } from './task';

// Get current branch name
export const branch = () =>
	attemptAsync(async () => {
		const result = await runTask('git rev-parse --abbrev-ref HEAD').unwrap();
		return result.trim();
	});

// Get current commit hash
export const commit = () =>
	attemptAsync(async () => {
		const result = await runTask('git rev-parse HEAD').unwrap();
		return result.trim();
	});

// Get repository name (e.g., "drizzle-struct")
export const repoName = () =>
	attemptAsync(async () => {
		const result = await runTask('git rev-parse --show-toplevel').unwrap();
		const path = result.trim();
		return path.split('/').pop()!;
	});

// Get repository remote URL (origin URL)
export const repoUrl = () =>
	attemptAsync(async () => {
		const result = await runTask('git config --get remote.origin.url').unwrap();
		return result.trim();
	});
export const repoSlug = () =>
	attemptAsync(async () => {
		const result = await runTask('git config --get remote.origin.url').unwrap();
		const url = result.trim();

		// Match for SSH or HTTPS
		// Examples:
		// git@github.com:tsaxking/sveltekit-template.git
		// https://github.com/tsaxking/sveltekit-template.git
		const match = url.match(/[:/]([^/]+\/[^/]+)(?:\.git)?$/);

		if (!match) throw new Error(`Failed to parse repo slug from URL: ${url}`);

		return match[1]; // tsaxking/sveltekit-template
	});
