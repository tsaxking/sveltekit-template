/**
 * @fileoverview Time sync RPC endpoints for shared client/server access.
 *
 * @example
 * import * as ntpRemote from '$lib/remotes/ntp.remote';
 * const { time, date } = await ntpRemote.ntp();
 */
import { query } from '$app/server';
import { TimeService } from '$lib/services/ntp';

/**
 * Returns server time and last sync date.
 */
export const ntp = query(() => {
	return {
		time: TimeService.getTime(),
		date: TimeService.getLastSynced()
	};
});
