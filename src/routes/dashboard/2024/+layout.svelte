<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';

	type SidebarItem = {
		title: string;
		route: string;
	};

	type SidebarContent = {
		category: string;
		items: SidebarItem[];
	};

	let sidebar: SidebarContent[] = [
		{
			category: 'Overview',
			items: [
				{
					title: 'Event Summary',
					route: '/dashboard/2024/overview/event-summary'
				},
				{
					title: 'Matches',
					route: '/dashboard/2024/overview/matches'
				},
				{
					title: 'Robot Display',
					route: '/dashboard/2024/overview/robot-display'
				},
				{
					title: 'Strategy',
					route: '/dashboard/2024/overview/strategy'
				}
			]
		},
		{
			category: 'Scouting',
			items: [
				{
					title: 'Scouting Checklist',
					route: '/dashboard/2024/scouting/checklist'
				},
				{
					title: 'Scouting Questions',
					route: '/dashboard/2024/scouting/questions'
				}
			]
		},
		{
			category: 'Other',
			items: [
				{
					title: 'Quiz',
					route: '/dashboard/2024/other/quiz'
				}
			]
		}
	];

	const { children } = $props();
</script>

<Sidebar content={sidebar}>{@render children()}</Sidebar>
