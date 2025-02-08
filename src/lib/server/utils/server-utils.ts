import type { ServerCode } from 'ts-utils/status';
import { redirect } from '@sveltejs/kit';

export const status = (code: ServerCode) => {
	return redirect(code, `/status/${code}`);
};
