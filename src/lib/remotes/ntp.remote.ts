import { query } from '$app/server';
import { TimeService } from '$lib/services/ntp';

export const ntp = query(() => {
	return {
		time: TimeService.getTime(),
		date: TimeService.getLastSynced()
	};
});
