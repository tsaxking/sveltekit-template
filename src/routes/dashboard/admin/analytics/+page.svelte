<script lang="ts">
	import DB from '$lib/components/dashboard/Dashboard.svelte';
	import Card from '$lib/components/dashboard/Card.svelte';
	import { Dashboard } from '$lib/model/dashboard.js';
	import nav from '$lib/imports/admin';
	import { Chart, registerables } from 'chart.js';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	Chart.register(...registerables);

	nav();

	const { data } = $props();
	const pages = $derived(data.pages);

	let items = $derived(writable(Object.keys(pages)));

	const filter = new Dashboard.Card({
		icon: {
			type: 'material-icons',
			name: 'filter_list'
		},
		id: 'filter',
		size: {
			width: 3,
			height: 2,
			md: {
				width: 4,
				height: 2
			}
		},
		name: 'Filter'
	});

	const chartCard = new Dashboard.Card({
		icon: {
			type: 'material-icons',
			name: 'analytics'
		},
		name: 'Analytics',
		id: 'analytics',
		size: {
			width: 9,
			height: 2,
			md: {
				width: 8,
				height: 2
			}
		}
	});

	const dashboard = new Dashboard.Dashboard({
		name: 'Analytics',
		cards: [chartCard, filter],
		id: 'analytics'
	});

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const render = () => {
		if (chart) chart.destroy();
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Failed to get canvas context');
		}

		chart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: Object.keys(pages).filter((p) => $items.includes(p)),
				datasets: [
					{
						label: 'Page Views',
						data: Object.keys(pages)
							.filter((p) => $items.includes(p))
							.map((page) => pages[page].views)
					},
					{
						label: 'Averate Retention (minutes)',
						data: Object.keys(pages)
							.filter((p) => $items.includes(p))
							.map((page) => pages[page].retention / pages[page].views / 60)
					},
					{
						label: 'Unique Visitors',
						data: Object.keys(pages)
							.filter((p) => $items.includes(p))
							.map((page) => pages[page].uniqueVisitors)
					}
				]
			},
			options: {
				responsive: true,
				plugins: {
					legend: {
						display: true,
						position: 'top'
					}
				}
			}
		});
	};

	onMount(() => {
		render();

		return items.subscribe(render);
	});
</script>

<svelte:head>
	<title>Analytics</title>
</svelte:head>

<DB {dashboard}>
	{#snippet body()}
		<Card card={chartCard}>
			{#snippet body()}
				<canvas bind:this={canvas} style="width: 100%; height: 300px;"></canvas>
			{/snippet}
		</Card>
		<Card card={filter}>
			{#snippet body()}
				<!-- Checkboxes to remove from items -->
				<ul class="list-group list-group-flush">
					{#each Object.keys(pages) as item}
						<li class="list-group-item d-flex align-items-centent ws-nowrap">
							<input
								class="form-check-input me-1"
								type="checkbox"
								id="check-{item}"
								checked={true}
								onchange={() => {
									if ($items.includes(item)) {
										$items = $items.filter((i) => i !== item);
									} else {
										$items = [...$items, item];
									}
								}}
							/>
							<label class="form-check-label" for="check-{item}">{item}</label>
						</li>
					{/each}
				</ul>
			{/snippet}
		</Card>
	{/snippet}
</DB>
