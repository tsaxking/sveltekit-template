import { query } from '$app/server';
import { getFeatureList } from '$lib/server/utils/features';

export const list = query(async () => {
	const list = await getFeatureList();
	if (list.isOk()) {
		return list.value;
	} else {
		return [];
	}
});
