import { Navbar } from '$lib/model/navbar';

export default () => {
	Navbar.addSection({
		name: 'Admin',
		links: [
			{
				name: 'Logs',
				href: '/dashboard/admin/logs',
				icon: {
					type: 'material-icons',
					name: 'format_list_numbered'
				}
			},
			{
				name: 'Data',
				href: '/dashboard/admin/data',
				icon: {
					type: 'material-icons',
					name: 'account_tree'
				}
			},
			{
				name: 'Analytics',
				href: '/dashboard/admin/analytics',
				icon: {
					type: 'material-icons',
					name: 'analytics'
				}
			}
		],
		priority: 0
	});
};
