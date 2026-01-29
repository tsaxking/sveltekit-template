<!--
@component
Datetime input that normalizes to an ISO string on change.

**Props**
- `data`: `string` — Current value (bindable).
- `header`: `string` — Unused label placeholder.
- `onChange`: `(value: string) => void` — Called with ISO string.

**Example**
```svelte
<DateInput bind:data onChange={(v) => console.log(v)} />
```
-->
<script lang="ts">
	interface Props {
		data: string;
		header: string;
		onChange: (value: string) => void;
	}

	let {
		data = $bindable(),
		// header,
		onChange
	}: Props = $props();
</script>

<input
	type="datetime-local"
	bind:value={data}
	onchange={(v) => {
		onChange(new Date(v.currentTarget.value).toISOString());
	}}
/>
