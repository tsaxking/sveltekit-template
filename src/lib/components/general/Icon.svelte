<script lang="ts">
	import { type Icon } from '$lib/types/icons';

	interface Props {
		icon: Icon;
	}

	const { icon }: Props = $props();
</script>

{#if icon.type === 'material-icons'}
	<i class="material-icons">{icon.name}</i>
{:else if icon.type === 'material-symbols'}
	<span class="material-symbols-outlined">{icon.name}</span>
{:else if icon.type === 'fontawesome'}
	<i class={`fa fa-${icon.name}`}></i>
{:else if icon.type === 'svg'}
	<img src={icon.name} alt="Icon" style="width: 1em; height: 1em;" />
{:else if icon.type === 'bootstrap'}
	<i class={`bi bi-${icon.name}`}></i>
{/if}
