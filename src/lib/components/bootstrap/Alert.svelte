<!--
@component
Floating alert notification card.

**Props**
- `title`: `string` — Alert title.
- `message`: `string` — Alert body text.
- `color`: `BootstrapColor` — Bootstrap contextual color.
- `autoHide`: `number` — Auto-hide timeout in milliseconds.
- `icon`?: `Snippet` — Optional icon snippet.
- `onHide`?: `() => void` — Called after hide.
- `onShow`?: `() => void` — Called after show.

**Exports**
- `show()`: show alert.
- `hide()`: hide alert.
- `destroy()`: cleanup timers.

**Example**
```svelte
<Alert title="Saved" message="Settings updated" color="success" autoHide={3000} />
```
-->
<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import type { BootstrapColor } from 'colors/color';
	import { onMount, type Snippet } from 'svelte';
	import { notifs } from '$lib/utils/prompts';
	import { fade } from 'svelte/transition';

	interface Props {
		title: string;
		message: string;
		color: BootstrapColor;
		autoHide: number; // ms
		icon?: Snippet; // svg
		onHide?: () => void;
		onShow?: () => void;
	}

	const id = Math.random();

	const { title, message, color, autoHide = 5000, icon, onHide, onShow }: Props = $props();

	const start = Date.now();
	let time = $state('Just now');

	const interval: any = setInterval(() => {
		switch (true) {
			case Date.now() - start < 1000:
				time = 'Just now';
				break;
			case Date.now() - start < 1000 * 60:
				time = `${Math.floor((Date.now() - start) / 1000)} seconds ago`;
				break;
			case Date.now() - start < 1000 * 60 * 60:
				time = `${Math.floor((Date.now() - start) / 1000 / 60)} minutes ago`;
				break;
			case Date.now() - start < 1000 * 60 * 60 * 24:
				time = `${Math.floor((Date.now() - start) / 1000 / 60 / 60)} hours ago`;
				break;
			default:
				time = `${Math.floor((Date.now() - start) / 1000 / 60 / 60 / 24)} days ago`;
				break;
		}
		if (autoHide > 0 && Date.now() - start > autoHide) {
			hide();
		}
	}, 1000 * 30);

	let timeout: any | undefined;

	$effect(() => {
		if (autoHide > 0) {
			timeout = setTimeout(() => hide(), autoHide);
		}
	});

	onMount(() => destroy);

	export const destroy = () => {
		clearInterval(interval);
		if (timeout) clearTimeout(timeout);
	};

	let doShow = $state(false);

	export const hide = async () => {
		doShow = false;
		onHide?.();
		notifs.update((n) => n.filter((i) => i !== id));
	};
	export const show = async () => {
		doShow = true;
		onShow?.();
		notifs.update((n) => [...n, id]);
	};
	let alert: HTMLDivElement;

	onMount(() => {
		show();
	});
</script>

<div
	bind:this={alert}
	class="alert alert-{color} alert-dismissible p-3 text-white shadow"
	role="alert"
	aria-atomic="true"
	aria-live="assertive"
	style="
		position: fixed;
		width: 300px;
		right: 20px;
		top: {$notifs.indexOf(id) * 80 + 20}px;
		transition: all 0.2s ease-in-out;
		display: {doShow ? 'block' : 'none'};
		z-index: 1050;
  		background: color-mix(in srgb, var(--bg-{color}) 50%, transparent);
	"
	transition:fade={{ duration: 200 }}
>
	{@render icon?.()}
	<div class="d-flex justify-content-between">
		<h5 class="alert-heading">{title}</h5>
		<div
			class="
				d-flex
				justify-content-between
				align-items-center
				h-100
			"
		>
			<small>{time}</small>
			<button type="button" class="btn px-3 py-0 my-0" aria-label="Close" onclick={hide}>
				<i class="material-icons">close</i>
			</button>
		</div>
	</div>
	<hr class="my-1" />
	<p class="mb-1">{message}</p>
</div>
