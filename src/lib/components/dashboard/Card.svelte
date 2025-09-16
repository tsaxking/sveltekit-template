<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { capitalize } from 'ts-utils/text';
	import { Dashboard } from '$lib/model/dashboard';
	import { browser } from '$app/environment';

	const CARD_HEIGHT = 300; // in pixels
	const GAP = 10; // gap between cards in pixels

	interface Props {
		body: Snippet;
		card: Dashboard.Card;
		style?: string;
	}

	let { body, card, style = '' }: Props = $props();

	let height = $state(card.height * CARD_HEIGHT + (card.height - 1) * GAP);

	let resizeTimeout: number | undefined;
	const onResize = () => {
		if (!browser) return;
		if (resizeTimeout) cancelAnimationFrame(resizeTimeout);

		resizeTimeout = requestAnimationFrame(() => {
			card.resize();
			let { height: h } = card.getSize();
			height = h * CARD_HEIGHT + (h - 1) * GAP;
		});
	};

	onResize();

	onMount(() => {
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
</script>

{#if $card.show}
	<!-- Overlay for graying out the background when card is maximized -->
	{#if $card.maximized}
		<div
			class="overlay"
			role="button"
			aria-label="Close overlay"
			tabindex="0"
			onclick={() => card.minimize()}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && card.minimize()}
		></div>
	{/if}

	<div
		class="card animate__animated animate__fadeIn"
		class:maximized={$card.maximized}
		style="
			grid-column: span {$card.width};
			grid-row: span {$card.height};
			height: {height}px;
			{style}
		"
	>
		<div class="card-header px-2">
			<div class="d-flex h-100 align-items-center">
				<div class="card-title h-100 m-0">
					<div class="d-flex align-items-center h-100">
						{#if card.config.icon.type === 'bootstrap'}
							<i class="bi bi-{card.config.icon.name}"></i>
						{:else if card.config.icon.type === 'fontawesome'}
							<i class="fa fa-{card.config.icon.name}"></i>
						{:else if card.config.icon.type === 'material-icons'}
							<i class="material-icons h4 mb-0">{card.config.icon.name}</i>
						{:else if card.config.icon.type === 'svg'}
							<img src={card.config.icon.name} alt={card.config.name} class="icon" />
						{:else if card.config.icon.type === 'material-symbols'}
							<span class="material-symbols-outlined h4 mb-0">{card.config.icon.name}</span>
						{/if}
						<h5 class="ms-3 mb-0">
							{capitalize(card.config.name)}
						</h5>
					</div>
				</div>
				<div class="ms-auto">
					<button
						class="btn btn-sm px-1"
						onclick={() =>
							card.update((c) => ({
								...c,
								maximized: !c.maximized
							}))}
						aria-label="Maximize"
					>
						{#if $card.maximized}
							<i class="material-icons h4 mb-0">close_fullscreen</i>
						{:else}
							<i class="material-icons h4 mb-0">open_in_full</i>
						{/if}
					</button>
					{#if !$card.maximized}
						<button class="btn btn-sm px-1" onclick={() => card.hide()} aria-label="Close">
							{#if $card.show}
								<i class="material-icons h4 mb-0">close</i>
							{:else}
								<i class="material-icons h4 mb-0">open_in_full</i>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
		<div class="card-body py-0 px-3">
			{@render body()}
		</div>
	</div>
{/if}

<style>
	/* .card {
		transition: all 0.3s ease;
	} */

	.maximized {
		position: fixed !important;
		height: 80% !important;
		width: 80% !important;
		top: 10% !important;
		left: 10% !important;
		z-index: 1000 !important;
	}

	/* Overlay styling */
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent gray */
		z-index: 999; /* Just below the maximized card */
	}

	.card-body {
		height: 217px;
	}

	.maximized .card-body {
		height: 60vh;
	}
</style>
