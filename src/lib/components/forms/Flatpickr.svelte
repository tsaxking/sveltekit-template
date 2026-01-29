<!--
@component
Flatpickr date input wrapper. For more information, go to: https://flatpickr.js.org/getting-started/

**Props**
- `id`: `string` — Input id.
- `value`?: `Date | null` — Initial date.
- `options`?: `Partial<flatpickr.Options.Options>` — Flatpickr options.
- `className`?: `string` — CSS class for the input.
- `onChange`?: `(date: Date) => void` — Called when a date is selected.

**Example**
```svelte
<Flatpickr id="start" value={startDate} onChange={(d) => (startDate = d)} />
```
-->
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
