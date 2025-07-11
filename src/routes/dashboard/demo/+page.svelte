<script lang="ts">
	import Card from '$lib/components/dashboard/Card.svelte';
	import { Dashboard } from '$lib/model/dashboard';
	import DB from '$lib/components/dashboard/Dashboard.svelte';
	import { onMount } from 'svelte';
	import { Navbar } from '$lib/model/navbar';
	import { contextmenu } from '$lib/utils/contextmenu';

	Navbar.addSection({
		name: 'Demo Section',
		links: [
			{
				icon: {
					type: 'material-icons',
					name: 'home'
				},
				href: '/home',
				name: 'Home'
			}
		],
		priority: 1
	});

	const card1 = new Dashboard.Card({
		name: 'Card 1',
		icon: {
			type: 'material-icons',
			name: 'home'
		},
		id: 'card1',
		size: {
			width: 3,
			height: 1,
			xl: {
				width: 2,
				height: 2
			}
		}
	});

	const card2 = new Dashboard.Card({
		name: 'Card 2',
		icon: {
			type: 'material-icons',
			name: 'edit'
		},
		id: 'card2',
		size: {
			width: 3,
			height: 1,
			sm: {
				width: 6,
				height: 2
			}
		}
	});

	const card3 = new Dashboard.Card({
		name: 'Card 3',
		icon: {
			type: 'material-icons',
			name: 'settings'
		},
		id: 'card3',
		size: {
			width: 3,
			height: 1
		}
	});

	const card4 = new Dashboard.Card({
		name: 'Card 4',
		icon: {
			type: 'material-icons',
			name: 'image'
		},
		id: 'card4',
		size: {
			width: 3,
			height: 1
		}
	});

	const dashboard = new Dashboard.Dashboard({
		name: 'Demo',
		id: 'demo',
		cards: [card1, card2, card3, card4]
	});

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.fillStyle = 'red';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
	});
</script>

<svelte:head>
	<title>Dashboard Demo</title>
</svelte:head>

<DB {dashboard}>
	{#snippet body()}
		<Card card={card1}>
			{#snippet body()}
				<h1>Card 1</h1>
				<p>This is the body of card 1</p>
			{/snippet}
		</Card>
		<Card card={card2}>
			{#snippet body()}
				<h1
					oncontextmenu={(e) => {
						contextmenu(e, {
							options: [
								'Test',
								{
									icon: {
										type: 'material-icons',
										name: 'edit'
									},
									name: 'Edit',
									action: () => console.log('edit')
								}
							],
							width: '200px'
						});
					}}
				>
					Card 2
				</h1>
				<p>This is the body of card21</p>
			{/snippet}
		</Card>
		<Card card={card3}>
			{#snippet body()}
				<h1>Card 3</h1>
				<p>This is the body of card 3</p>
			{/snippet}
		</Card>
		<Card card={card4}>
			{#snippet body()}
				<canvas
					style="object-fit: contain; height: 100%; width: 100%;"
					height="500"
					width="1000"
					bind:this={canvas}
				></canvas>
			{/snippet}
		</Card>
	{/snippet}
</DB>
