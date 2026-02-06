<!--
@component
SSE test page at `/test/sse`.
-->
<script lang="ts">
	import { sse } from '$lib/services/sse';

	const start = () => {
		return fetch('/test/sse/init', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Metadata': sse.uuid
			}
		});
	};

	let messages: {
		event: string;
		data: string;
	}[] = $state([]);

	sse.on('you-are', (data) => {
		messages.push({
			event: 'you-are',
			data: String(data)
		});
	});
</script>

<div>
	<button type="button" class="btn btn-primary" onclick={start}>Start</button>

	<pre>
	{#each messages as message}
			{message.event}: {message.data}
		{/each}
	</pre>
</div>
