<!--
@component
Username change input with availability checks.

**Props**
- `account`: `Account.AccountData` — Current account.

**Example**
```svelte
<UsernameChange {account} />
```
-->
<script lang="ts">
	import { Account } from '$lib/model/account';

	interface Props {
		account: Account.AccountData;
	}

	const { account }: Props = $props();

	let username = $derived(account.data.username || '');
	let usernameState: 'exists' | 'available' | 'checking' | 'yours' | 'error' = $state('yours');
	let testTimeout: ReturnType<typeof setTimeout> | null = null;

	const test = () => {
		if (testTimeout) clearTimeout(testTimeout);

		testTimeout = setTimeout(() => {
			Account.usernameExists(username)
				.unwrap()
				.then((result) => {
					if (result) {
						usernameState = 'exists';
					} else if (username === account.data.username) {
						usernameState = 'yours';
					} else {
						usernameState = 'available';
					}
				})
				.catch((_err) => {
					usernameState = 'error';
				});
		}, 500);
	};
</script>

<div class="form-floating mb-3">
	<input
		type="text"
		class="form-control"
		id="change-username"
		placeholder="Change Username"
		bind:value={username}
		oninput={test}
	/>
	<label for="change-username">Change Username</label>
	{#if usernameState === 'checking'}
		<div class="form-text">Checking...</div>
	{:else if usernameState === 'available'}
		<div class="form-text text-success">Username is available!</div>
	{:else if usernameState === 'exists'}
		<div class="form-text text-danger">Username already exists!</div>
	{:else if usernameState === 'yours'}
		<div class="form-text text-info">This is your current username.</div>
	{:else if usernameState === 'error'}
		<div class="form-text text-danger">An error occurred while checking the username.</div>
	{/if}
</div>
