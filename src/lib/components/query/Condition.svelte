<script lang="ts" generics="T extends Blank">
	import { Struct, type Blank } from '$lib/services/struct/struct.ts';
    import { Condition } from '$lib/services/struct/search';

    interface Props {
        struct: Struct<T>;
        node: Condition<T>;
    }

    const { struct, node }: Props = $props();

    export const remove = () => {
        node.remove();
    };
</script>


<div class="condition">
    <button type="button" class="btn" onclick={remove}>
        <i class="material-icons">close</i>
    </button>

    <select 
        class="col-select form-select"
        onselect={(val) => {
            node.col = val.currentTarget.value;
            node.inform();
        }}
    >
        {#each Object.keys(struct.data.structure) as column}
            <option value={column}>{column}</option>
        {/each}
    </select>

    <select 
            class="op-select form-select"
            bind:value={node.op}
            onselect={(e) => {
                // prevent type error
                Object.assign(node, {
                    op: e.currentTarget.value,
                });
                node.inform();
            }}
        >
        <option value="contains">contains</option>
        <option value="equals">equals</option>
        <!-- <option value="startsWith">starts with</option> -->
        <!-- <option value="endsWith">ends with</option> -->
        <option value="=">=</option>
        <option value=">">&gt;</option>
        <option value="<">&lt;</option>
        <option value=">=">&gt;=</option>
        <option value="<=">&lt;=</option>
    </select>

    <input class="value-input form-select" type="text" bind:value={node.value} onchange={(e) => {
        node.value = e.currentTarget.value;
        node.inform();
    }} oninput={(e) => {
        node.value = e.currentTarget.value;
        node.inform();
    }} />
</div>

<style>
    .condition {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .col-select, .op-select, .value-input {
        padding: 0.25rem;
        font-size: 1rem;
    }
</style>