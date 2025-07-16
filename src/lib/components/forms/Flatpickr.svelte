<script lang="ts">
	import flatpickr from 'flatpickr';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		value?: Date | null;
		options?: Partial<flatpickr.Options.Options>;
		className?: string;
		onChange?: (date: Date) => void;
		id: string;
	}

	let { value = null, options = {}, className = '', onChange, id }: Props = $props();

	let inputEl: HTMLInputElement;
	let fp: flatpickr.Instance | null = null;

	const handleChange = (selectedDates: Date[]) => {
		const selected = selectedDates[0] ?? null;
		value = selected;
		if (selected && onChange) onChange(selected);
	};

	onMount(() => {
		fp = flatpickr(inputEl, {
			...options,
			defaultDate: value ?? undefined,
			onChange: handleChange
		});
	});

	$effect(() => {
		if (fp && value) {
			fp.setDate(value, false);
		}
	});

	onDestroy(() => {
		fp?.destroy();
		fp = null;
	});
</script>

<input {id} bind:this={inputEl} class={className} type="text" placeholder="Select date..." />
