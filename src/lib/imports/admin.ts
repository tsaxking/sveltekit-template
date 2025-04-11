import { Navbar } from '$lib/model/navbar';

export default () => {
	Navbar.addSection({
		name: 'Admin',
		links: [
			{
				name: 'Logs',
				href: '/dashboard/admin/logs',
				icon: 'format_list_numbered',
				type: 'material-icons'
			},
			{
				name: 'Data',
				href: '/dashboard/admin/data',
				icon: 'account_tree',
				type: 'material-icons'
			}
		],
		priority: 0
	});
};
