<script lang="ts">
	import '$lib/styles/gsi.css';
	import { env } from '$env/dynamic/public';
	import type { ActionData } from './$types';
	import Password from '$lib/components/forms/Password.svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Form } from '$lib/utils/form';

	let { form }: { form?: ActionData } = $props();

	// let user = $state(form?.user || '');

	if (form?.redirect && browser) {
		goto(form.redirect);
	}

	const requestPasswordReset = () => {
		new Form()
			// '/account/sign-in?/request-password-reset',
			// 'POST',
			.input('user', {
				type: 'text',
				placeholder: 'Username or Email',
				label: 'Username or Email',
				required: true
			})
			.prompt({
				title: 'Request Password Reset',
				send: false
			})
			.then((val) => {
				if (val.isErr()) {
					return console.error(val.error);
				}

				fetch('/account/sign-in?/request-password-reset', {
					method: 'POST',
					body: new FormData(val.value.form)
				});
			});
	};
</script>

<main>
	<div class="container pt-5">
		<div class="row">
			<h1>
				{env.PUBLIC_APP_NAME}: Sign In
			</h1>
		</div>
		<div class="row mb-3">
			<a href="/account/sign-up" class="link-primary">Sign Up</a>
		</div>
		<div class="row mb-3">
			<form action="?/login" method="post">
				<div class="mb-3 form-floating">
					<input
						id="user"
						name="user"
						class="form-control"
						placeholder="Username or Email"
						type="text"
						value={form?.user ?? ''}
					/>
					<label class="form-label" for="user"> Username or Email </label>
				</div>
				<div class="mb-3 form-floating">
					<Password
						name="password"
						placeholder=""
						floatingLabel={true}
						label="Password"
						buttonColor="primary"
					/>
				</div>

				<a href="/account/password-reset" class="link-primary"> Password Reset </a>

				<hr />
				{#if form?.message}
					{#if form.message === 'Logged in'}
						<p class="text-success">Logged in successfully</p>
					{:else}
						<p class="text-danger">
							{form.message}
						</p>
					{/if}
				{/if}
				<button type="submit" class="btn btn-primary"> Sign In </button>
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
							<span class="gsi-material-button-contents">Sign in with Google</span>
							<span style="display: none;">Sign in with Google</span>
						</div>
					</button>
				</form>
			</div>
			<div class="col">
				<button class="btn btn-secondary" onclick={requestPasswordReset}>
					Request Password Reset
				</button>
			</div>
		</div>
	</div>
</main>
