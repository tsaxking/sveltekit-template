<!--
@component
Bootstrap card with optional glow, minimize, and hide controls.

**Props**
- `title`: `string` — Card title.
- `body`: `Snippet` — Card body content.
- `color`?: `BootstrapColor` — Background color class.
- `classes`?: `string` — Additional CSS classes.
- `glowColor`?: `BootstrapColor` — Glow accent color.

**Exports**
- `minimize()`: hide body content.
- `maximize()`: show body content.
- `hide()`: hide card.
- `show()`: show card.

**Example**
```svelte
<Card title="Stats">
	{#snippet body()}
		<p>Content</p>
	{/snippet}
</Card>
```
-->
<script lang="ts">
	import type { BootstrapColor } from 'colors/color';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		color?: BootstrapColor;
		body: Snippet;
		classes?: string;
		glowColor?: BootstrapColor;
	}

	const { title, body, color, classes = '', glowColor }: Props = $props();

	const glowColorProxy = $derived(glowColor ? `glow glow-${glowColor}` : 'shadow');
	const colorProxy = $derived(color ? `bg-${color}` : '');

	let minimized = $state(false);
	let hidden = $state(false);

	export const minimize = () => (minimized = true);

	export const maximize = () => (minimized = false);

	export const hide = () => (hidden = true);

	export const show = () => (hidden = false);
</script>

<div class="card toggle-hide {classes} {colorProxy} {glowColorProxy}" class:hide={hidden}>
	<div class="card-header">
		<h5 class="card-title">
			{title}
		</h5>
	</div>
	<div class="card-body toggle-hide" class:hide={minimized}>
		{@render body()}
	</div>
</div>

<style>
	.hide {
		display: none;
	}

	.toggle-hide {
		transition: all 0.5s;
	}
</style>
