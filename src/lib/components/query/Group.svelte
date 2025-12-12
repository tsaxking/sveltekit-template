<script lang="ts" generics="T extends Blank">
	import { Struct, type Blank } from '$lib/services/struct/struct.ts';
    import { Group, Condition } from '$lib/services/struct/search';
	import C from './Condition.svelte';
    import G from './Group.svelte';

    interface Props {
        struct: Struct<T>;
        node: Group<T>;
    }

    const { struct, node }: Props = $props();
</script>

<div class="container-fluid">
    {#each $node.nodes as n}
        <div class="row mb-3">
            {#if n instanceof Condition}
                <C {struct} node={n} />
            {:else if n instanceof Group}
                <G {struct} node={n} />
            {/if}
        </div>
    {/each}
    <div class="row mb-3">
        <div class="col">
            <button type="button" class="btn btn-primary me-2" onclick={() => node.addCondition()}>
                Add Condition
            </button>
            <button type="button" class="btn btn-secondary" onclick={() => node.addGroup()}>
                Add Group
            </button>
            <button type="button" class="btn btn-danger" onclick={() => node.remove()}>
                <i class="material-icons">
                    close
                </i>
                Remove Group
            </button>
        </div>
    </div>
</div>