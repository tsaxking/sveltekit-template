import { DB } from '../src/lib/server/db';
import { Account } from '../src/lib/server/structs/account';

export default async () => {
	await Account.Account.build(DB).unwrap();

	Account.Account.each((account) => {
		account.update({
			username: account.data.username.toLowerCase(),
			email: account.data.email.toLowerCase()
		});
	});
};
