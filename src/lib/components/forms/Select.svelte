<!--
@component
Simple select control with optional placeholder option.

**Props**
- `options`: `string[]` — Available options.
- `value`?: `string` — Current value (bindable).
- `default`?: `string` — Placeholder label.
- `onChange`: `(index: number) => void` — Called with selected index.

**Exports**
- `select(value: string)`: set selected value programmatically.

**Example**
```svelte
<Select
	options={['A', 'B']}
	default="Choose..."
	bind:value
	onChange={(i) => console.log(i)}
/>
```
-->
<script lang="ts">
	interface Props {
		options: string[];
		value?: string;
		default?: string;
		onChange: (index: number) => void;
	}

	const { options, value = $bindable(), default: defaultValue, onChange }: Props = $props();

	let selected = $state(value);
	export const select = (value: string) => {
		selected = value;
	};

	const handleChange = () => {
		if (!selected) return onChange(-1);
		onChange(options.indexOf(selected));
	};
</script>

<select class="form-select" bind:value={selected} onchange={handleChange}>
	{#if defaultValue}
		<option value="" disabled selected={!selected}>{defaultValue}</option>
	{/if}
	{#each options as option}
		<option value={option}>{option}</option>
	{/each}
</select>
