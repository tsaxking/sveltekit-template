<script lang="ts">
	import Profile from '$lib/components/account/Profile.svelte';
	import { Account } from '$lib/model/account.js';

	const { data } = $props();

	const account = $derived(Account.Account.Generator(data.account));
	const info = $derived(Account.AccountInfo.Generator(data.info));
</script>

<div class="container layer-1">
	<div class="row mb-3">
		<h1>{$account.username}'s Profile</h1>
	</div>
	<div class="row mb-3">
		<Profile {account} />
	</div>
</div>
