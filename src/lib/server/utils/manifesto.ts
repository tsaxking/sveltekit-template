import fs from 'fs';
import path from 'path';

/**
 * Cached manifesto content to avoid repeated file system reads
 * @private
 * @type {string}
 */
let manifesto = '';

/**
 * Gets the route manifesto content from the route-tree.pages file.
 * Caches the content after the first read for performance.
 * The manifesto contains route patterns with wildcard support.
 *
 * @export
 * @returns {string} The manifesto content as a string
 * @example
 * ```typescript
 * const routes = getManifesto();
 * console.log('Available routes:', routes.split('\n'));
 * ```
 */
export const getManifesto = () => {
	if (manifesto) return manifesto;
	manifesto = fs.readFileSync(path.resolve(process.cwd(), 'private', 'route-tree.pages'), 'utf-8');
	return manifesto;
};

/**
 * Finds a matching route pattern in the manifesto for a given URL.
 * Supports wildcard matching where '*' in patterns can match any URL segment.
 * Compares URL segments against manifesto patterns to find exact matches.
 *
 * @export
 * @param {string} url - The URL to match against manifesto patterns
 * @returns {string | null} The matching pattern from the manifesto, or null if no match found
 * @example
 * ```typescript
 * // Manifesto contains: /users/[*]/profile
 * const pattern = getManifestoInstance('/users/123/profile');
 * console.log(pattern); // "/users/[*]/profile"
 *
 * const noMatch = getManifestoInstance('/unknown/route');
 * console.log(noMatch); // null
 * ```
 */
export const getManifestoInstance = (url: string) => {
	const manifesto = getManifesto();

	// Split URL into segments and remove empty ones
	const segments = url.split('/').filter(Boolean);
	// Split manifesto into individual pattern lines
	const patterns = manifesto.split('\n').filter(Boolean);

	// Check each pattern for a match
	for (const pattern of patterns) {
		const patternSegments = pattern.split('/').filter(Boolean);
		// Skip if segment count doesn't match
		if (patternSegments.length !== segments.length) continue;

		let isMatch = true;
		// Compare each segment, allowing '*' to match anything
		for (let i = 0; i < patternSegments.length; i++) {
			// Wildcard '*' matches any segment
			if (patternSegments[i] === '*') continue;
			// Exact match required for non-wildcard segments
			if (patternSegments[i] !== segments[i]) {
				isMatch = false;
				break;
			}
		}

		if (isMatch) return pattern;
	}

	return null;
};
