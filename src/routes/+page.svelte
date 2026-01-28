<!--
@component
Root home page route for `/`.

Displays the landing card and bootstraps global client styles via `$lib/index`.
Uses the page title from the global `__APP_ENV__` config to keep branding consistent.
-->
<script lang="ts">
	import Card from '$lib/components/bootstrap/Card.svelte';
	import '$lib/index';
</script>

<svelte:head>
	<title>{__APP_ENV__.name}</title>
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
