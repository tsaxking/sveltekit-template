<script lang="ts">
	import Profile from '$lib/components/account/Profile.svelte';
	import UsernameChange from '$lib/components/account/UsernameChange.svelte';
	import { Account } from '$lib/model/account.js';

	const { data } = $props();

	const account = $derived(Account.Account.Generator(data.account));
</script>

<div class="container layer-1">
	<div class="row mb-3">
		<h1>Manage your profile</h1>
	</div>
	<!-- <div class="row mb-3">
        <Profile {account} />
    </div> -->

	<div class="row mb-3">
		<div class="col">
			<UsernameChange {account} />
		</div>
	</div>
</div>
