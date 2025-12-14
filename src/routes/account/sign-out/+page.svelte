<script lang="ts">
	const goBack = () => {
		window.history.back();
	};
</script>

<div class="container d-flex flex-column align-items-center justify-content-center vh-100">
	<div class="card shadow-sm p-4 text-center" style="max-width: 400px; width: 100%;">
		<h2 class="mb-3">Are you sure you want to sign out?</h2>
		<form method="POST" action="?/sign-out" class="w-100">
			<button type="button" class="btn btn-outline-primary mx-3" onclick={goBack}>Go Back</button>
			<button type="submit" class="btn btn-outline-danger mx-3">Sign Out</button>
		</form>
	</div>
</div>
