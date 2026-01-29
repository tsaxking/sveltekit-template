/**
 * @fileoverview Path matching utility for ignore/allow rules.
 *
 * Supports `*`, `**`, and negation patterns similar to .gitignore.
 *
 * @example
 * const matcher = pathMatch('admin/**\n!admin/public/**');
 * matcher.test('admin/settings');
 */
/**
 * Enhanced ignore matcher (no external deps):
 * - Supports *, **, partial wildcards, and negation (!)
 * - Skips empty lines and comments (#)
 * - Negation works if ! is the first non-whitespace character of the line
 */
function patternToRegExp(pattern: string): RegExp {
	// Escape regex special chars except * and /
	let re = pattern.replace(/([.+^${}()|[\]\\])/g, '\\$1').replace(/\*\*/g, '___DOUBLESTAR___'); // temp marker
	// Single *: match any non-slash chars
	re = re.replace(/\*/g, '[^/]*');
	// **: match anything, including slashes
	re = re.replace(/___DOUBLESTAR___/g, '.*');
	// Allow partial wildcards (foo*, *bar, *baz*)
	return new RegExp('^' + re + '$');
}

/**
 * Matches a target path against a list of file patterns.
 * @param lines The file patterns that will result to true
 * @param target The path to test
 * @returns Whether the target matches any of the patterns
 */
export const pathMatch = (lines: string) => {
	const patterns = lines
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'));

	return {
		test: (target: string) => {
			let ignored = false;
			for (const pattern of patterns) {
				let pat = pattern;
				let negated = false;
				if (pat.startsWith('!')) {
					negated = true;
					pat = pat.slice(1).trim();
				}
				if (!pat) continue;
				const regex = patternToRegExp(pat);
				if (regex.test(target)) {
					ignored = !negated;
				}
			}
			return ignored;
		},
		getPattern: (url: string) => {
			// return all patterns that match the url
			const segments = url.split('/').filter(Boolean);
			const matchedPatterns = patterns.filter((pattern) => {
				let pat = pattern;
				if (pat.startsWith('!')) {
					pat = pat.slice(1).trim();
				}
				if (!pat) return false;
				const patternSegments = pat.split('/').filter(Boolean);
				if (patternSegments.length !== segments.length) return false;

				let isMatch = true;
				for (let i = 0; i < patternSegments.length; i++) {
					if (patternSegments[i] === '*') continue;
					if (patternSegments[i] !== segments[i]) {
						isMatch = false;
						break;
					}
				}
				return isMatch;
			});
			return matchedPatterns;
		}
	};
};
