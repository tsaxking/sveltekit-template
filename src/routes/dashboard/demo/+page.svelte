<script lang="ts">
	import Card from '$lib/components/dashboard/Card.svelte';
	import { Dashboard } from '$lib/model/dashboard';
	import DB from '$lib/components/dashboard/Dashboard.svelte';
	import { onMount } from 'svelte';
	import { Navbar } from '$lib/model/navbar';

	Navbar.addSection({
		name: 'Demo Section',
		links: [
			{
				icon: 'home',
				href: '/home',
				name: 'Home',
				type: 'material-icons'
			}
		],
		priority: 1
	});

	const card1 = new Dashboard.Card({
		name: 'Card 1',
		iconType: 'material-icons',
		icon: 'home',
		id: 'card1',
		size: {
			width: 1,
			height: 1,
			xl: {
				width: 1,
				height: 2
			}
		}
	});

	const card2 = new Dashboard.Card({
		name: 'Card 2',
		iconType: 'material-icons',
		icon: 'edit',
		id: 'card2',
		size: {
			width: 1,
			height: 1,
			sm: {
				width: 1,
				height: 2
			}
		}
	});

	const card3 = new Dashboard.Card({
		name: 'Card 3',
		iconType: 'material-icons',
		icon: 'delete',
		id: 'card3',
		size: {
			width: 1,
			height: 1
		}
	});

	const card4 = new Dashboard.Card({
		name: 'Card 4',
		iconType: 'material-icons',
		icon: 'person',
		id: 'card4',
		size: {
			width: 1,
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
				<h1>Card 2</h1>
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
