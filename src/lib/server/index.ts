import { Struct } from 'drizzle-struct/back-end';
import { Account } from './structs/account';
import terminal from './utils/terminal';
import testSchema from '../../../scripts/test-schema';

testSchema('false');
const postBuild = async () => {
	const admin = await Account.Account.fromProperty(
		'username',
		process.env.ADMIN_USERNAME || 'admin',
		{ type: 'single' }
	);
	if (admin.isErr()) {
		terminal.error(`Failed to find admin account: ${admin.error}`);
		return;
	}
	if (!admin.value) {
		terminal.log('No admin account found, creating one...');
		const res = await Account.createAccount(
			{
				username: process.env.ADMIN_USERNAME || 'admin',
				email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
				password: process.env.ADMIN_PASSWORD || 'Admin123!',
				firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
				lastName: process.env.ADMIN_LAST_NAME || 'User'
			},
			{
				canUpdate: false
			}
		).unwrap();

		await res
			.update({
				verified: true,
				verification: ''
			})
			.unwrap();

		await Account.Admins.new(
			{
				accountId: res.id
			},
			{
				static: true
			}
		).unwrap();
	}
};

{
	const built = new Set<string>();
	for (const struct of Struct.structs.values()) {
		struct.once('build', () => {
			built.add(struct.name);
			if (built.size === Struct.structs.size) {
				postBuild();
			}
		});
	}
}
