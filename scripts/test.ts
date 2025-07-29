import { Struct } from 'drizzle-struct/back-end';
import { Account } from '../src/lib/server/structs/account';
import { DB } from '../src/lib/server/db';

export default async () => {
	await Struct.buildAll(DB).unwrap();

	const single = await Account.Account.fromProperty('verified', false, {
		type: 'single'
	}).unwrap();

	if (!single) return;

	single.update({
		verified: true
	});

	Account.Account.on('update', ({ from, to }) => {
		if (from.verified !== to.data.verified) {
			//
		}
	});
};
