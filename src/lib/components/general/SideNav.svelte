<!--
@component
Side navigation offcanvas that renders sections from the navbar registry.

**Props**
- `id`: `string` — Offcanvas element id.

**Exports**
- `hide()`: close any open offcanvas menus.

**Example**
```svelte
<SideNav id="pages" />
```
-->
<script lang="ts">
	import { Navbar } from '$lib/model/navbar';
	import { onMount } from 'svelte';
	// import { Analytics } from '$lib/model/analytics';
	// import { getTitle } from '$lib/utils/pages';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const sections = Navbar.getSections();

	export const hide = () => {
		import('bootstrap').then((bs) => {
			document.querySelectorAll('.offcanvas').forEach((oc) => {
				const instance = bs.Offcanvas.getOrCreateInstance(oc);
				instance.hide();
			});
		});
	};

	// let limit = $state(10);
	// let count = $state(0);
	// let offset = $state(0);

	onMount(() => {
		const onHide = () => {};

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
		<h5 class="offcanvas-title" id="{id}Label">{__APP_ENV__.name}</h5>
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
								<a
									class:disabled={link.disabled}
									class="text-reset text-decoration-none"
									{...link.disabled ? {} : { href: link.href }}
									{...link.disabled ? {} : { onclick: hide }}
									target={link.external ? '_blank' : '_self'}
									rel={link.external ? 'noopener noreferrer' : undefined}
									{...link.disabled ? { tabindex: -1, 'aria-disabled': 'true' } : {}}
								>
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
		</ul>
	</div>
</div>

<style>
	a.disabled {
		pointer-events: none;
		opacity: 0.6;
	}
</style>
