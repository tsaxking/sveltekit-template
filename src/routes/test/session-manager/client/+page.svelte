<script lang="ts">
	import { onMount } from 'svelte';
	import { sse } from '$lib/services/sse';

	let connected = false;
	let eventCount = 0;
	let lastEvent = '';

	onMount(() => {
		sse.on('connect', () => {
			connected = true;
		});

		sse.on('session-manager:test', (data) => {
			eventCount += 1;
			try {
				lastEvent = JSON.stringify(data);
			} catch {
				lastEvent = String(data);
			}
		});
	});
</script>

<div class="container">
	<h1>Session Manager Client</h1>
	<p data-testid="client-connection" data-connected={connected} data-uuid={sse.uuid}>
		SSE Connected: {connected ? 'true' : 'false'}
	</p>
	<p data-testid="client-event-count">{eventCount}</p>
	<p data-testid="client-last-event">{lastEvent}</p>
</div>
