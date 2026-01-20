<script lang="ts">
	import '$lib/services/sse';
	import { startManager } from '$lib/utils/remote-utils.remote.ts';

	let response = $state('unknown');
</script>

<button
	type="button"
	class="btn btn-primary"
	onclick={async () => {
		response = await startManager();
	}}>{response}</button
>
