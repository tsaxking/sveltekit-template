<script lang="ts">
	import { Dashboard } from '$lib/model/dashboard';

	interface Props {
		dashboard: Dashboard.Dashboard;
	}

	const { dashboard }: Props = $props();

	const cards = $state(dashboard.hiddenCards);
</script>

{#if $cards.size > 0}
	<div class="w-100 d-flex align-items-center">
		<p class="m-0">Minimized:</p>
		{#each $cards.values() as card}
			<button class="btn btn-small" onclick={() => card.show()}>
				{#if card.config.icon.type === 'bootstrap'}
					<i class="bi bi-{card.config.icon.name}"></i>
				{:else if card.config.icon.type === 'fontawesome'}
					<i class="fa fa-{card.config.icon.name}"></i>
				{:else if card.config.icon.type === 'material-icons'}
					<i class="material-icons">{card.config.icon.name}</i>
				{:else if card.config.icon.type === 'svg'}
					<img src={card.config.icon.name} alt="icon" class="icon-svg" />
				{/if}
			</button>
		{/each}
	</div>
{/if}
