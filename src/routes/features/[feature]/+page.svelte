<script lang="ts">
    import { marked } from 'marked';
	import { onMount } from 'svelte';

    const { data } = $props();

    const feature = $derived(data.feature);

    let html: HTMLElement;

    const render = async () => {
        html.innerHTML = await marked.parse(feature);
    };


    onMount(() => {
        render();

        return () => {
            html.innerHTML = '';
        }
    });
</script>

<div class="container layer-2">
    <div bind:this={html}></div>
</div>