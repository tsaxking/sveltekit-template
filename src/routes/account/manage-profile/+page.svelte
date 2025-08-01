<script lang="ts">
	import UsernameChange from '$lib/components/account/UsernameChange.svelte';
	import { Account } from '$lib/model/account.js';

	const { data } = $props();

	const account = $derived(Account.Account.Generator(data.account));
	const info = $derived(Account.AccountInfo.Generator(data.info));

	const proxy = $derived(Account.AccountInfo.Proxy(info));

	proxy.data.bio = 'Hello world!';

	proxy.update(p => ({
		...p,
		bio: 'Hello world 2',
	}));
</script>

<div class="container layer-1">
	<div class="row mb-3">
		<h1>Manage your profile</h1>
	</div>

	<div class="row mb-3">
		<div class="col">
			<UsernameChange {account} />
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<!-- {$account.archived} -->
		</div>
	</div>
</div>
