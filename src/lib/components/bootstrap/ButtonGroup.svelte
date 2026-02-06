<!--
@component
Bootstrap button group wrapper.

**Props**
- `size`?: `'sm' | 'md' | 'lg'` — Button group size (default: `'sm'`).
- `vertical`?: `boolean` — Render vertically when `true`.
- `label`?: `string` — Accessible label for the group.
- `buttons`: `Snippet` — Content for the button group.

**Example**
```svelte
<ButtonGroup size="md" label="Actions">
	{#snippet buttons()}
		<button class="btn btn-primary">Save</button>
		<button class="btn btn-outline-secondary">Cancel</button>
	{/snippet}
</ButtonGroup>
```
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		size?: 'sm' | 'md' | 'lg';
		vertical?: boolean;
		label?: string;
		buttons: Snippet;
	}

	const { size = 'sm', vertical = false, label = '', buttons }: Props = $props();
</script>

<div
	class="btn-group btn-group-{size}"
	role="group"
	aria-label={label}
	class:btn-group-vertical={vertical}
>
	{@render buttons()}
</div>
