<script lang="ts">
	import Card from '$lib/components/bootstrap/Card.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
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
