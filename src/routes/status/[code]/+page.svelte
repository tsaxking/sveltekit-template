<script>
	const { data } = $props();
	const { code, url, message, status } = data;
</script>

<div class="container d-flex flex-column align-items-center justify-content-center vh-100">
	<div class="card shadow-sm p-4 text-center" style="max-width: 400px; width: 100%;">
		<h2 class="mb-3">{code}: {message}</h2>
		<p class="text-muted">
			The server responded with status code: {status}
		</p>

		{#if url}
			<hr />
			<p>
				Redirected from: <a href={url}>{url}</a>
			</p>
		{/if}

		<a href="/" class="btn btn-primary mt-3">Back to home</a>
	</div>
</div>
