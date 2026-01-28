<!--
@component
Status test page at `/test/status`.
-->
<script lang="ts">
	import { sse } from '$lib/services/sse';

	let connected = $state(false);

	sse.on('connect', () => {
		connected = true;
	});
	sse.on('disconnect', () => {
		connected = false;
	});
</script>

<ul class="list-group">
	<li class="list-group-item">
		<p class="data-test">
			<strong>Socket Connection Status:</strong>
			{#if connected}
				<span class="text-success">Connected</span>
			{:else}
				<span class="text-danger">Disconnected</span>
			{/if}
		</p>
	</li>
</ul>
