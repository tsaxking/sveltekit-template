import fs from 'fs';
import path from 'path';

let manifesto = '';
export const getManifesto = () => {
	if (manifesto) return manifesto;
	manifesto = fs.readFileSync(path.resolve(process.cwd(), 'private', 'route-tree.pages'), 'utf-8');
	return manifesto;
};

export const getManifestoInstance = (url: string) => {
	const manifesto = getManifesto();

	// detect if url matches /foo/bar/*/baz pattern in manifesto
	// Returns the pattern in the manifesto that matches the url

	const segments = url.split('/').filter(Boolean);
	const patterns = manifesto.split('\n').filter(Boolean);

	for (const pattern of patterns) {
		const patternSegments = pattern.split('/').filter(Boolean);
		if (patternSegments.length !== segments.length) continue;

		let isMatch = true;
		for (let i = 0; i < patternSegments.length; i++) {
			if (patternSegments[i] === '*') continue;
			if (patternSegments[i] !== segments[i]) {
				isMatch = false;
				break;
			}
		}

		if (isMatch) return pattern;
	}

	return null;
};
