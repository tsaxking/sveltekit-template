<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';
    import showdown from 'showdown';
	import { onMount } from 'svelte';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';

    const { data } = $props();
    const md = $derived(data.md);
    const tree = $derived(data.tree);

    $inspect(tree);

    let content = $state('');

    $effect(() => {
        const converter = new showdown.Converter();
        content = converter.makeHtml(md);
    })

    type Tree = {
        name: string;
        children?: Tree[];
        path: string;
    }
</script>

<nav class="navbar navbar-expand-lg bg-body-tertiary">
  <div class="container-fluid">
    <button class="btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasExample" aria-controls="offcanvasExample">
        <i class="material-icons">
            menu
        </i>
    </button>

    <a class="navbar-brand" href="/">{PUBLIC_APP_NAME}</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
      </ul>
      <form class="d-flex" role="search">
        <input class="form-control me-2" type="search" placeholder="Search" aria-label="Search"/>
        <button class="btn btn-outline" type="submit">Search</button>
      </form>
    </div>
  </div>
</nav>

{#snippet subtree(tree: Tree)}
    <ul class="nav flex-column">
        {#each (tree.children || []) as child}
            {#if child.name.includes('index')}
                <li class="nav-item">
                    <a href="/releases/{child.path.replace('index.md', '')}" class="nav-link">
                        {capitalize(fromSnakeCase(tree.name))}
                    </a>
                </li>
            {:else}
                <li>
                    <div class="ps-1">
                        {@render subtree(child)}
                    </div>
                </li>
            {/if}
        {/each}
    </ul>
{/snippet}

<div class="offcanvas offcanvas-start" tabindex="-1" id="offcanvasExample" aria-labelledby="offcanvasExampleLabel">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title" id="offcanvasExampleLabel">
        Release Notes
    </h5>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
  </div>
  <div class="offcanvas-body">
    {@render subtree(tree)}
  </div>
</div>

<div class="container">
    {@html content}
</div>