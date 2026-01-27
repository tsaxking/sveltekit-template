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
	{#each options as option (option)}
		<option value={option}>{option}</option>
	{/each}
</select>
