import { StatusCodes, getReasonPhrase } from 'http-status-codes';

export const load = (event) => {
	const code = event.params.code;

	return {
		code,
		status: StatusCodes[Number(code)],
		message: getReasonPhrase(Number(code)) || 'Unknown',
		url: event.url.searchParams.get('url')
	};
};
