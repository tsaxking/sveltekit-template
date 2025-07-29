import { TimeService } from '$lib/server/services/ntp';
import { json } from '@sveltejs/kit';

export const GET = () => {
	return json({
		time: TimeService.getTime(),
		date: TimeService.getLastSynced()
	});
};
