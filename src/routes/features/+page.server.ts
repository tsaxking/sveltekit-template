import { getFeatureList } from '$lib/server/utils/features';

export const load = async () => {
	const features = await getFeatureList().unwrap();
	return {
		features
	};
};
