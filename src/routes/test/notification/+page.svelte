<script lang="ts">
	import { notify } from '$lib/utils/prompts';
	import { onMount } from 'svelte';

	const addNotif = () =>
		notify({
			color: 'success',
			message: 'Test Message',
			title: 'Test title'
		});

	// onMount(() => addNotif());
</script>

<button type="button" class="btn btn-primary" onclick={addNotif}>Click me!</button>
