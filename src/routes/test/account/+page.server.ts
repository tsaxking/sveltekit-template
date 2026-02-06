/**
 * @fileoverview Server load for `/test/account`.
 */
export const load = (event) => {
	return {
		account: event.locals.account ? event.locals.account.safe() : null
	};
};
