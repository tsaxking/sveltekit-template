<script lang="ts">
	import { page } from '$app/state';
	import codes from 'http-status-codes';
</script>

<div class="container d-flex flex-column align-items-center justify-content-center vh-100">
	<div class="card shadow-sm p-4 text-center" style="max-width: 400px; width: 100%;">
		<h2 class="mb-3">
			{page.params.code}: {page.error?.message || codes.getStatusText(page.params.code)}
		</h2>

		<p class="text-muted">
			The server responded with status code: {codes.getStatusText(page.params.code)}
		</p>

		<a href="/" class="btn btn-primary mt-3">Back to home</a>
	</div>
</div>
