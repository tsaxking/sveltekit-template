<script lang="ts">
	import { page } from '$app/state';
	// const { data } = $props();
	// console.log(data);
	// const status = $derived(data.status);
	// const text = $derived(data.text);
</script>

<div class="container d-flex flex-column align-items-center justify-content-center vh-100">
	<div class="card shadow-sm p-4 text-center" style="max-width: 400px; width: 100%;">
		<h2 class="mb-3">{page.status}: {page.error?.message}</h2>

		<a href="/" class="btn btn-primary mt-3">Back to home</a>
	</div>
</div>
