<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import showdown from 'showdown';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';
	import Modal from '$lib/components/bootstrap/Modal.svelte';
	import { onMount } from 'svelte';
  	import SvelteMarkdown from 'svelte-markdown';

	const { data, form = $bindable() } = $props();
	const md = $derived(data.md);
	const tree = $derived(data.tree);

	$inspect(form);

	let content = $state('');

	$effect(() => {
		const converter = new showdown.Converter();
		content = converter.makeHtml(md);
	});

	type Tree = {
		name: string;
		children?: Tree[];
		path: string;
	};

	let searchModal: Modal;

	onMount(() => {
		if (form) searchModal.show();
	});
</script>

<nav class="navbar navbar-expand-lg bg-body-tertiary">
	<div class="container-fluid">
		<button
			class="btn"
			type="button"
			data-bs-toggle="offcanvas"
			data-bs-target="#side-releases-nav"
			aria-controls="side-releases-nav"
		>
			<i class="material-icons"> menu </i>
		</button>

		<a class="navbar-brand" href="/">{PUBLIC_APP_NAME}</a>
		<button
			class="navbar-toggler"
			type="button"
			data-bs-toggle="collapse"
			data-bs-target="#top-releases-nav"
			aria-controls="top-releases-nav"
			aria-expanded="false"
			aria-label="Toggle navigation"
		>
			<span class="navbar-toggler-icon"></span>
		</button>
		<div class="collapse navbar-collapse" id="top-releases-nav">
			<ul class="navbar-nav me-auto mb-2 mb-lg-0"></ul>
			<form class="d-flex" action="?/search" method="post">
				<input
					name="search"
					class="form-control me-2"
					type="text"
					placeholder="Search"
					aria-label="Search"
				/>
				<button class="btn btn-outline" type="submit">Search</button>
			</form>
		</div>
	</div>
</nav>

{#snippet subtree(tree: Tree)}
	<ul class="nav flex-column">
		{#each tree.children || [] as child}
			{#if child.name.includes('index')}
				<li class="nav-item">
					{#if `${page.url.pathname}/index.md`.endsWith(`/releases/${child.path}`)}
						<p>
							<strong>{capitalize(fromSnakeCase(tree.name))}</strong>
						</p>
					{:else}
						<p>
							<a class="nav-link" href={`/releases/${child.path}`.replace('/index.md', '')}>
								{capitalize(fromSnakeCase(tree.name))}
							</a>
						</p>
					{/if}
				</li>
			{:else}
				<li class="ps-3 nav-item">
					{@render subtree(child)}
				</li>
			{/if}
		{/each}
	</ul>
{/snippet}

<div
	class="offcanvas offcanvas-start"
	tabindex="-1"
	id="side-releases-nav"
	aria-labelledby="side-releases-navLabel"
>
	<div class="offcanvas-header">
		<h5 class="offcanvas-title" id="side-releases-navLabel">Release Notes</h5>
		<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
	</div>
	<div class="offcanvas-body">
		{@render subtree(tree)}
	</div>
</div>

<div class="container">
	<div class="row mb-3">
		<h1 class="text-muted">
			{capitalize(fromSnakeCase(tree.name))}
		</h1>
	</div>
	<!-- {@html content} -->
	<SvelteMarkdown source={md} />
</div>

<Modal bind:this={searchModal} title="Search" size="lg">
	{#snippet body()}
		{#if form?.results && form.results.length > 0}
			<ul class="list-group">
				{#each form.results as result}
					<li class="list-group-item">
						<a href={`/releases/${result.filename}`.replace('/index.md', '')}>
							{result.filename.replace('/index.md', '').split('/').pop()}
						</a>
						<p class="text-muted">
							{@html result.html}
						</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-muted">No results found.</p>
		{/if}
	{/snippet}
	{#snippet buttons()}{/snippet}
</Modal>
