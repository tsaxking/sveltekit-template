<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { Navbar } from '$lib/model/navbar';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const sections = Navbar.getSections();
</script>

<div class="offcanvas offcanvas-start" tabindex="-1" {id} aria-labelledby="{id}Label">
	<div class="offcanvas-header">
		<h5 class="offcanvas-title" id="{id}Label">{PUBLIC_APP_NAME}</h5>
		<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
	</div>
	<div class="offcanvas-body">
		<ul class="list-unstyled">
			{#each $sections as section}
				<li>
					<h4 class="text-secondary">{section.name}</h4>
					<ul class="list-unstyled">
						{#each section.links as link}
							<li class="ps-3">
								<a class="text-reset text-decoration-none" href={link.href}>
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
