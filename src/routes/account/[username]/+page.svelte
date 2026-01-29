<!--
@component
Account public profile page for `/account/[username]`.

Renders public-facing account details and related UI for the specified username.
Designed as a top-level page route and does not export component props.
-->
<script lang="ts">
	import Profile from '$lib/components/account/Profile.svelte';
	import { Account } from '$lib/model/account.js';

	const { data } = $props();

	const account = $derived(Account.Account.Generator(data.account));
	const _info = $derived(Account.AccountInfo.Generator(data.info));
</script>

<div class="container layer-1">
	<div class="row mb-3">
		<h1>{$account.username}'s Profile</h1>
	</div>
	<div class="row mb-3">
		<Profile {account} />
	</div>
</div>
