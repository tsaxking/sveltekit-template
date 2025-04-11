<script lang="ts">
	import { page } from '$app/state';
	import codes from 'http-status-codes';
	import { toSnakeCase } from 'ts-utils/text';
</script>

<div class="container d-flex flex-column align-items-center justify-content-center vh-100">
	<div class="card shadow-sm p-4 text-center" style="max-width: 400px; width: 100%;">
		<h2 class="mb-3">{page.status}: {page.error?.message}</h2>

		<p class="text-muted">
			The server responded with status code: {toSnakeCase(codes.getStatusText(page.status))
				.toUpperCase()
				.slice(1)
				.replace(/__/g, '_')}
		</p>

		<a href="/" class="btn btn-primary mt-3">Back to home</a>
	</div>
</div>
