<script lang="ts">
	import Card from '$lib/components/bootstrap/Card.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import Modal from '$lib/components/bootstrap/Modal.svelte';
	import { onMount } from 'svelte';

	let m: Modal;

	onMount(() => {
		m.show();
	});
</script>

<svelte:head>
	<title>{PUBLIC_APP_NAME}</title>
</svelte:head>

<div class="container mt-5">
	<div class="row">
		<div class="col">
			<Card title="Page">
				{#snippet body()}
					<h1>Page</h1>
					<p>This is a page.</p>
				{/snippet}
			</Card>
		</div>
	</div>
</div>

<Modal title="hi" bind:this={m}>
	{#snippet body()}
		Hello world
	{/snippet}
</Modal>