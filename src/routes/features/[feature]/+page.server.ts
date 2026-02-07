import { domain } from '$lib/server/utils/env.js';
import { getFeature } from '$lib/server/utils/features.js';

export const load = async (event) => {
	const feature = await getFeature(event.params.feature, {
		domain: domain({
			port: false,
			protocol: true
		})
	}).unwrap();
	return {
		feature
	};
};
