import { Navbar } from '$lib/model/navbar';
import * as remote from '$lib/remotes/features.remote';

export default async () => {
	const features = await remote.list();

	Navbar.addSection({
		name: 'Features',
		links: features.map((f) => ({
			name: f.name,
			href: `/features/${f.id}`,
			icon: f.icon
		})),
		priority: 0
	});
};
