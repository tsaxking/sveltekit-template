/**
 * @fileoverview Client load for `/account/password-reset/[id]`.
 */
export const load = (event) => {
	return {
		account: event.data.account
	};
};
