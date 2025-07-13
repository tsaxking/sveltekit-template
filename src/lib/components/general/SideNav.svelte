<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { Navbar } from '$lib/model/navbar';
	import { onMount } from 'svelte';
	import { Analytics } from '$lib/model/analytics';
	import { getTitle } from '$lib/utils/pages';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const sections = Navbar.getSections();

	let links: {
		link: Analytics.LinkData;
		title: string;
	}[] = $state([]);

	$inspect(links);

	export const hide = () => {
		import('bootstrap').then((bs) => {
			document.querySelectorAll('.offcanvas').forEach((oc) => {
				const instance = bs.Offcanvas.getOrCreateInstance(oc);
				instance.hide();
			});
		});
	};

	let limit = $state(10);
	let count = $state(0);
	let offset = $state(0);

	const getLinks = async () => {
		Analytics.myLinks({
			offset: offset,
			limit: limit
		}).then(async (data) => {
			if (data.isOk()) {
				links = await Promise.all(
					data.value.map(async (link) => {
						const res = await getTitle(link.data.url || '');
						let title: string;

						if (res.isOk()) title = res.value;
						else {
							title = '';
						}
						return {
							link,
							title
						};
					})
				);
			} else console.error('Failed to fetch links:', data.error);
		});

		Analytics.count().then((res) => {
			if (res.isOk()) {
				count = res.value;
			}
		});
	};

	$effect(() => {
		if (!isNaN(limit) && !isNaN(offset)) {
			getLinks();
		}
	});

	onMount(() => {
		getLinks();

		const onHide = () => {
			getLinks();
		};

		offcanvas.addEventListener('hide.bs.offcanvas', onHide);

		return () => {
			offcanvas.removeEventListener('hide.bs.offcanvas', onHide);
		};
	});

	let offcanvas: HTMLDivElement;
</script>

<div
	bind:this={offcanvas}
	class="offcanvas offcanvas-start"
	tabindex="-1"
	{id}
	aria-labelledby="{id}Label"
>
	<div class="offcanvas-header layer-2">
		<h5 class="offcanvas-title" id="{id}Label">{PUBLIC_APP_NAME}</h5>
		<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
	</div>
	<div class="offcanvas-body layer-2">
		<ul class="list-unstyled">
			{#each $sections as section}
				<li class="mb-3">
					<h4 class="text-secondary">{section.name}</h4>
					<ul class="list-unstyled">
						{#each section.links as link}
							<li class="ps-3 mb-2">
								<a class="text-reset text-decoration-none" href={link.href} onclick={hide}>
									{#if link.icon.type === 'material-icons'}
										<i class="material-icons">{link.icon.name}</i>
									{:else if link.icon.type === 'fontawesome'}
										<i class="fa fa-{link.icon.name}"></i>
									{:else if link.icon.type === 'material-symbols'}
										<i class="material-symbols">{link.icon.name}</i>
									{:else if link.icon.type === 'bootstrap'}
										<i class="bi bi-{link.icon.name}"></i>
									{:else if link.icon.type === 'svg'}
										<span class="svg-icon">{link.icon.name}</span>
									{/if}
									<span>{link.name}</span>
								</a>
							</li>
						{/each}
					</ul>
				</li>
			{/each}
			<li class="mb-3 no-select">
				<div class="d-flex align-items-center justify-content-between">
					<h4 class="text-secondary">Recents ({links.length} / {count})</h4>
					{#if count > limit}
						<div class="d-flex">
							<button
								class="btn ms-2"
								class:disabled={offset === 0}
								onclick={() => {
									offset = Math.max(0, offset - limit);
									getLinks();
								}}
								disabled={offset === 0}
								title="Previous Page"
								aria-label="Previous Page"
								aria-disabled={offset === 0}
							>
								<i class="material-icons">chevron_left</i>
							</button>
							<button
								disabled={offset + limit >= count}
								title="Next Page"
								aria-label="Next Page"
								aria-disabled={offset + limit >= count}
								class:disabled={offset + limit >= count}
								class="btn ms-2"
								onclick={() => {
									offset += limit;
									getLinks();
								}}
							>
								<i class="material-icons">chevron_right</i>
							</button>
						</div>
					{/if}
				</div>
				<ul class="list-unstyled">
					{#each links as link}
						{#if link.title.length > 0}
							<li class="ps-3 mb-2">
								<a class="text-muted text-decoration-none" href={link.link.data.url} onclick={hide}>
									<span>{link.title}</span>
								</a>
							</li>
						{/if}
					{/each}
				</ul>
			</li>
		</ul>
	</div>
</div>
