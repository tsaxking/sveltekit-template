import { Struct } from 'drizzle-struct/back-end';
import { Account } from './structs/account';
import terminal from './utils/terminal';
import testSchema from '../../../scripts/test-schema';
import { config } from './utils/env';

testSchema('false');
export const postBuild = async () => {
	const lifetimeLoop = Struct.generateLifetimeLoop(
		1000 * 60 * 60 * 24 * 7 // 1 week
	);
	lifetimeLoop.start();

	const ADMIN_USERNAME = config.admin.user;
	const ADMIN_EMAIL = config.admin.email;
	const ADMIN_PASSWORD = config.admin.pass;
	const ADMIN_FIRST_NAME = config.admin.first_name;
	const ADMIN_LAST_NAME = config.admin.last_name;

	const admin = await Account.Account.fromProperty('username', ADMIN_USERNAME, { type: 'single' });
	if (admin.isErr()) {
		terminal.error(`Failed to find admin account: ${admin.error}`);
		return;
	}
	if (!admin.value) {
		terminal.log('No admin account found, creating one...');
		const res = await Account.createAccount(
			{
				username: ADMIN_USERNAME,
				email: ADMIN_EMAIL,
				password: ADMIN_PASSWORD,
				firstName: ADMIN_FIRST_NAME,
				lastName: ADMIN_LAST_NAME
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
