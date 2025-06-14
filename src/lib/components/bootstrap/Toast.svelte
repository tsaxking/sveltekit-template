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
		textColor?: BootstrapColor;
		onHide?: () => void;
		onShow?: () => void;
	}

	const {
		title,
		message,
		color,
		autoHide = 5000,
		// icon,
		animate,
		textColor,
		onHide,
		onShow
	}: Props = $props();

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
			toast.classList.add('animate__animated', 'animate__slideOutRight');
			await sleep(1000);
			doShow = false;
			setTimeout(() => {
				toast.classList.remove('animate__animated', 'animate__slideOutRight');
				onHide?.();
			}, 1000);
		} else {
			doShow = false;
			onHide?.();
		}
	};
	export const show = async () => {
		if (animate) {
			toast.classList.add('animate__animated', 'animate__slideInRight');
			doShow = true;
			await sleep(2000);
			toast.classList.remove('animate__animated', 'animate__slideInRight');
		} else {
			doShow = true;
		}
		onShow?.();
	};

	let textColorProxy = $state(textColor);
	$effect(() => {
		if (!textColorProxy) {
			switch (color) {
				case 'primary':
				case 'secondary':
				case 'success':
				case 'danger':
				case 'warning':
				case 'info':
				case 'light':
				case 'dark':
					textColorProxy = 'white';
					break;
				default:
					textColorProxy = 'dark';
					break;
			}
		}
	});
	let toast: HTMLDivElement;
	onMount(() => show());
</script>

<div
	bind:this={toast}
	class="toast"
	role="alert"
	class:show={doShow}
	aria-atomic="true"
	aria-live="assertive"
>
	<div class="toast-header bg-dark border-0 text-{color}">
		<strong class="me-auto">{title}</strong>
		<small>{time}</small>
		<button
			class="btn-close btn-close-white"
			aria-label="Close"
			data-bs-dismiss="toast"
			type="button"
			onclick={() => hide()}
		></button>
	</div>
	<div class="toast-body bg-{color} text-{textColorProxy}">
		{message}
	</div>
</div>
