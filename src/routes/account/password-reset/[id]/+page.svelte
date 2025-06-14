<script lang="ts">
	import { notify } from '$lib/utils/prompts';
	import { passwordStrength } from 'check-password-strength';

	const { data, form } = $props();

	const { account } = data;

	if (form?.message) {
		notify({
			autoHide: 3000,
			color: 'warning',
			title: 'Error',
			message: form.message,
			textColor: 'dark'
		});
	}

	let password = $state('');
	let confirmPassword = $state('');
	let passwordResult: {
		id: number;
		value: 'Too Weak' | 'Weak' | 'Medium' | 'Strong';
		contains: ('lowercase' | 'uppercase' | 'symbol' | 'number')[];
		length: number;
	} = $state({
		id: 0,
		value: 'Too Weak',
		contains: [],
		length: 0
	});

	$effect(() => {
		passwordResult = passwordStrength(password);
	});
</script>

<div class="container d-flex flex-column align-items-center justify-content-center vh-100">
	<div class="card shadow-sm p-4 text-center" style="max-width: 400px; width: 100%;">
		<div class="container-fluid">
			<div class="row">
				<h2 class="mb-3">Reset password for {account}</h2>
				<p class="text-muted">Enter your new password below.</p>
			</div>
			<div class="row">
				<form action="?/reset" method="post">
					<div class="form-group">
						<label for="password">Password</label>
						<input
							type="password"
							class="form-control"
							id="password"
							name="password"
							required
							bind:value={password}
						/>
					</div>

					<div class="form-group">
						<label for="confirmPassword">Confirm password</label>
						<input
							type="password"
							class="form-control"
							id="confirmPassword"
							name="confirmPassword"
							required
							bind:value={confirmPassword}
						/>
					</div>

					<button type="submit" class="btn btn-primary mt-3">Reset password</button>
				</form>
			</div>
			<div class="row">
				{#if passwordResult.value === 'Too Weak'}
					<p class="text-danger">Password is too weak</p>
				{:else if passwordResult.value === 'Weak'}
					<p class="text-warning">Password is weak</p>
				{:else if passwordResult.value === 'Medium'}
					<p class="text-info">Password is medium</p>
				{:else if passwordResult.value === 'Strong'}
					<p class="text-success">Password is strong</p>
				{/if}
				<div
					class="progress"
					role="progressbar"
					aria-label="Basic example"
					aria-valuenow={passwordResult.id}
					aria-valuemin="0"
					aria-valuemax="3"
					style="height: 1px;"
				>
					<div class="progress-bar w-{(passwordResult.id * 100) / 3}"></div>
				</div>
				{#if !passwordResult.contains.includes('lowercase')}
					<p class="text-danger">Password must contain a lowercase letter</p>
				{/if}
				{#if !passwordResult.contains.includes('uppercase')}
					<p class="text-danger">Password must contain an uppercase letter</p>
				{/if}
				{#if !passwordResult.contains.includes('symbol')}
					<p class="text-danger">Password must contain a symbol</p>
				{/if}
				{#if !passwordResult.contains.includes('number')}
					<p class="text-danger">Password must contain a number</p>
				{/if}
				{#if passwordResult.length < 8}
					<p class="text-danger">Password must be at least 8 characters long</p>
				{/if}
				{#if confirmPassword !== password}
					<p class="text-danger">Passwords do not match</p>
				{/if}
			</div>
		</div>
	</div>
</div>
