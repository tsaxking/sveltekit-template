import { attemptAsync } from 'ts-utils/check';
import { runTask } from './task';

/**
 * Gets the current Git branch name.
 *
 * @export
 * @async
 * @returns {Promise<AttemptAsync<string>>} Promise resolving to the current branch name
 * @example
 * ```typescript
 * const currentBranch = await branch();
 * if (currentBranch.isOk()) {
 *   console.log('Current branch:', currentBranch.value);
 * }
 * ```
 */
export const branch = () =>
	attemptAsync(async () => {
		const result = await runTask('git rev-parse --abbrev-ref HEAD').unwrap();
		return result.trim();
	});

/**
 * Gets the current Git commit hash (full SHA).
 *
 * @export
 * @async
 * @returns {Promise<AttemptAsync<string>>} Promise resolving to the current commit hash
 * @example
 * ```typescript
 * const commitHash = await commit();
 * if (commitHash.isOk()) {
 *   console.log('Current commit:', commitHash.value);
 * }
 * ```
 */
export const commit = () =>
	attemptAsync(async () => {
		const result = await runTask('git rev-parse HEAD').unwrap();
		return result.trim();
	});

/**
 * Gets the repository name from the top-level directory.
 * Extracts the directory name from the Git repository's root path.
 *
 * @export
 * @async
 * @returns {Promise<AttemptAsync<string>>} Promise resolving to the repository name
 * @example
 * ```typescript
 * const name = await repoName();
 * if (name.isOk()) {
 *   console.log('Repository name:', name.value); // e.g., "sveltekit-template"
 * }
 * ```
 */
export const repoName = () =>
	attemptAsync(async () => {
		const result = await runTask('git rev-parse --show-toplevel').unwrap();
		const path = result.trim();
		return path.split('/').pop()!;
	});

/**
 * Gets the repository's origin remote URL.
 * Returns the URL configured for the origin remote.
 *
 * @export
 * @async
 * @returns {Promise<AttemptAsync<string>>} Promise resolving to the origin remote URL
 * @example
 * ```typescript
 * const url = await repoUrl();
 * if (url.isOk()) {
 *   console.log('Repository URL:', url.value);
 *   // e.g., "git@github.com:tsaxking/sveltekit-template.git"
 *   // or "https://github.com/tsaxking/sveltekit-template.git"
 * }
 * ```
 */
export const repoUrl = () =>
	attemptAsync(async () => {
		const result = await runTask('git config --get remote.origin.url').unwrap();
		return result.trim();
	});

/**
 * Gets the repository slug in the format "owner/repository".
 * Parses the origin remote URL to extract the owner and repository name.
 * Supports both SSH and HTTPS Git URLs.
 *
 * @export
 * @async
 * @returns {Promise<AttemptAsync<string>>} Promise resolving to the repository slug
 * @throws {Error} When the URL format cannot be parsed
 * @example
 * ```typescript
 * const slug = await repoSlug();
 * if (slug.isOk()) {
 *   console.log('Repository slug:', slug.value); // e.g., "tsaxking/sveltekit-template"
 * }
 * ```
 */
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
