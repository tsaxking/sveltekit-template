<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { Navbar } from '$lib/model/navbar';
	import { onMount } from 'svelte';

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

			// // Ensure body scrolling is restored
			// document.body.style.overflow = '';
			// document.body.classList.remove('offcanvas-open');

			// // Remove any lingering backdrops
			// document.querySelectorAll('.offcanvas-backdrop').forEach((backdrop) => {
			// 	backdrop.remove();
			// });
		});
	};

	onMount(() => {
		// hide();
		// document.addEventListener('hidden.bs.offcanvas', () => {
		// 	document.body.style.overflow = '';
		// 	document.body.style.paddingRight = '';
		// 	document.body.classList.remove('offcanvas-open');
		// });
	});
</script>

<div class="offcanvas offcanvas-start" tabindex="-1" {id} aria-labelledby="{id}Label">
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
									{#if link.type === 'material-icons'}
										<i class="material-icons">{link.icon}</i>
									{:else if link.type === 'font-awesome'}
										<i class="fa fa-{link.icon}"></i>
									{:else if link.type === 'material-symbols'}
										<i class="material-symbols">{link.icon}</i>
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
