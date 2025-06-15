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
