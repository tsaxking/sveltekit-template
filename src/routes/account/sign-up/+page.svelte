<script lang="ts">
	import '$lib/styles/gsi.css';
	import { passwordStrength } from 'check-password-strength';
	import type { ActionData } from './$types';
	import Password from '$lib/components/forms/Password.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	let { form }: { form?: ActionData } = $props();

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

	$effect(() => {
		if (form?.redirect && browser) {
			goto(form.redirect);
		}
	});
</script>

<main>
	<div class="container pt-5">
		<div class="row">
			<h1>
				{__APP_ENV__.name}: Sign Up
			</h1>
		</div>
		<div class="row mb-3">
			<a href="/account/sign-in" class="link-primary">Sign In</a>
		</div>
		<div class="row mb-3">
			<form action="?/register" method="post">
				<div id="formMessage" class:d-none={!form?.message}>
					{#if form?.message}
						{#if form.message === 'Account created'}
							<p class="text-success">Account created successfully</p>
						{:else}
							<p class="text-danger">{form.message}</p>
						{/if}
					{/if}
				</div>
				<div class="container">
					<div class="row">
						<div class="col-md-6">
							<div class="mb-3 form-floating">
								<input
									id="username"
									name="username"
									class="form-control"
									placeholder="Username"
									type="text"
								/>
								<label class="form-label" for="username"> Username </label>
							</div>
						</div>
						<div class="col-md-6">
							<div class="mb-3 form-floating">
								<input
									id="email"
									name="email"
									class="form-control"
									placeholder="Email"
									type="email"
								/>
								<label class="form-label" for="email"> Email </label>
							</div>
						</div>
					</div>
					<div class="row">
						<div class="col-md-6">
							<div class="mb-3 form-floating">
								<input
									id="firstName"
									name="firstName"
									class="form-control"
									placeholder="First Name"
									type="text"
								/>
								<label class="form-label" for="firstName"> First Name </label>
							</div>
						</div>
						<div class="col-md-6">
							<div class="mb-3 form-floating">
								<input
									id="lastName"
									name="lastName"
									class="form-control"
									placeholder="Last Name"
									type="text"
								/>
								<label class="form-label" for="lastName"> Last Name </label>
							</div>
						</div>
					</div>
					<div class="row">
						<div class="col-md-6">
							<Password
								name="password"
								placeholder=""
								bind:value={password}
								floatingLabel={true}
								label="Password"
								buttonColor="primary"
								id="password"
							/>
						</div>
						<div class="col-md-6">
							<Password
								name="confirmPassword"
								placeholder=""
								bind:value={confirmPassword}
								floatingLabel={true}
								label="Confirm Password"
								buttonColor="primary"
								id="confirmPassword"
							/>
						</div>
					</div>
					<div class="row">
						<div class="col-12">
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
				<button type="submit" class="btn btn-primary" id="signUpButton"> Sign Up </button>
			</form>
		</div>
		<div class="row mb-3">
			<div class="col">
				<form action="?/OAuth2" method="POST">
					<button class="gsi-material-button">
						<div class="gsi-material-button-state"></div>
						<div class="gsi-material-button-content-wrapper">
							<div class="gsi-material-button-icon">
								<svg
									version="1.1"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 48 48"
									xmlns:xlink="http://www.w3.org/1999/xlink"
									style="display: block;"
								>
									<path
										fill="#EA4335"
										d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
									></path>
									<path
										fill="#4285F4"
										d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
									></path>
									<path
										fill="#FBBC05"
										d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
									></path>
									<path
										fill="#34A853"
										d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
									></path>
									<path fill="none" d="M0 0h48v48H0z"></path>
								</svg>
							</div>
							<span class="gsi-material-button-contents">Sign up with Google</span>
							<span style="display: none;">Sign up with Google</span>
						</div>
					</button>
				</form>
			</div>
		</div>
	</div>
</main>
