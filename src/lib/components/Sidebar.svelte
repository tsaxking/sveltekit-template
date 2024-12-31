<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	type SidebarItem = {
		title: string;
		route: string;
	};

	type SidebarContent = {
		category: string;
		items: SidebarItem[];
	};

	type Props = {
		content: SidebarContent[];
		children: Snippet[];
	};

	let { content, children } = $props();

	// Track whether the sidebar is collapsed
	let isCollapsed = $state(false);
</script>

<div class="d-flex">
	<!-- Sidebar -->
	<div class="sidebar bg-dark border-end vh-100" style="width: {isCollapsed ? '4rem' : '20rem'};">
		<button
			class="btn btn-secondary rounded-circle mx-2 my-3"
			style="width: 2.5rem; height: 2.5rem; display: flex; justify-content: center; align-items: center;"
			onclick={() => {
				isCollapsed = !isCollapsed;
			}}
			aria-label="Toggle sidebar"
		>
			{isCollapsed ? '>' : '<'}
		</button>
		<a
			class="btn btn-secondary rounded-circle mx-2 my-3"
			style="width: 2.5rem; height: 2.5rem; display: flex; justify-content: center; align-items: center;"
			href="/dashboard"
			aria-label="Go home"
		>
			🏠
		</a>
		{#if !isCollapsed}
			{#each content as category (category.category)}
				<div class="px-3">
					<h5 class="text-secondary">{category.category}</h5>
					<ul class="list-unstyled">
						{#each category.items as item}
							<li class="ps-3">
								<a
									href={item.route}
									class="text-decoration-none {item.route === page.url.pathname
										? 'text-primary'
										: 'text-light'}"
								>
									{item.title}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
			Yes I do know that this sidebar is ugly, I wanted to smash something together to see if my idea
			worked
		{/if}
	</div>

	{@render children?.()}
</div>

<style>
	/* Sidebar transition */
	.sidebar {
		transition: width 0.3s;
	}

	/* Sidebar link hover effect */
	.sidebar a:hover {
		color: #fff;
		text-decoration: underline;
	}

	/* Highlight current link */
	/* .text-primary {
		color: blue;
	} */
</style>
