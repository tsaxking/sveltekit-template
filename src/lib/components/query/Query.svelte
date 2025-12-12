<script lang="ts" generics="T extends Blank">
	import { Struct, type Blank } from '$lib/services/struct/struct.ts';
    import { Group, Search, Condition } from '$lib/services/struct/search';
    import G from './Group.svelte';
    import C from './Condition.svelte';
	import { onMount } from 'svelte';

    interface Props {
        struct: Struct<T>;
        search: Search<T>;
    }

    const { struct, search }: Props = $props();

    onMount(() => {
        search.subscribe(console.log);
    })
</script>


<div class="container-fluid">
    <div class="row mb-3">
        {#each $search.nodes as node}
            {#if node instanceof Group}
                <G {struct} node={node} />
            {:else if node instanceof Condition}
                <C {struct} node={node} />
            {/if}
        {/each}
    </div>
    <div class="row mb-3">
        <div class="col d-flex justify-content-end">
            <button type="button" class="btn btn-primary me-2" onclick={() => search.addGroup()}>
                <i class="material-icons">group_add</i>
                Add Group
            </button>
            <button type="button" class="btn btn-secondary" onclick={() => search.addCondition(Object.keys(struct.data.structure)[0], 'equals', '')}>
                <i class="material-icons">add</i>
                Add Condition
            </button>
        </div>
    </div>
</div>