export const load = (event) => {
	return {
		account: event.locals.account ? event.locals.account.safe() : null
	};
};
