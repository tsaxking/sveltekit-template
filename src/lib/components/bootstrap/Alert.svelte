<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import type { BootstrapColor } from 'colors/color';
	import { onMount, type Snippet } from 'svelte';
	import { sleep } from 'ts-utils/sleep';

	interface Props {
		title: string;
		message: string;
		color: BootstrapColor;
		autoHide: number; // ms
		icon?: Snippet; // svg
		animate: boolean;
		onHide?: () => void;
		onShow?: () => void;
	}

	const { title, message, color, autoHide = 5000, icon, animate, onHide, onShow }: Props = $props();

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

	if (autoHide > 0) {
		timeout = setTimeout(() => hide(), autoHide);
	}

	onMount(() => destroy);

	export const destroy = () => {
		clearInterval(interval);
		if (timeout) clearTimeout(timeout);
	};

	let doShow = $state(false);

	export const hide = async () => {
		if (animate) {
			alert.classList.add('animate__animated', 'animate__slideOutRight');
			await sleep(1000);
			doShow = false;
			setTimeout(() => {
				alert.classList.remove('animate__animated', 'animate__slideOutRight');
			}, 1000);
		} else {
			doShow = false;
		}
		onHide?.();
	};
	export const show = async () => {
		if (animate) {
			alert.classList.add('animate__animated', 'animate__slideInRight');
			doShow = true;
			await sleep(2000);
			alert.classList.remove('animate__animated', 'animate__slideInRight');
		} else {
			doShow = true;
		}
		onShow?.();
	};
	let alert: HTMLDivElement;

	onMount(() => show());
</script>

<div
	bind:this={alert}
	class="alert alert-{color} alert-dismissible fade p-3"
	role="alert"
	class:show={doShow}
	aria-atomic="true"
	aria-live="assertive"
>
	{@render icon?.()}
	<div class="d-flex justify-content-between">
		<h5 class="alert-heading">{title}</h5>
		<small style="padding-right: 32px;">{time}</small>
		<button type="button" class="btn-close px-3 py-4" aria-label="Close" onclick={hide}></button>
	</div>
	<hr class="my-1" />
	<p class="mb-1">{message}</p>
</div>
