<script lang="ts">
	import { Account } from '$lib/model/account';

	interface Props {
		onselect: (account: Account.AccountData) => void;
		onsearch?: (account: Account.AccountData[]) => void;
		filter?: (account: Account.AccountData) => boolean;
	}

	const { onselect, onsearch, filter }: Props = $props();

	let query = $state('');

	let timeout: ReturnType<typeof setTimeout>;

	let results = $state(Account.Account.arr());

	export const search = (query: string) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => {
			results = Account.search(query);
			if (filter) results.filter(filter);
			if (onsearch) onsearch(results.data);
			results.subscribe(console.log);
		}, 300);
	};

	export const select = (account: Account.AccountData) => {
		onselect(account);
		query = '';
	};
</script>

<div class="account-search">
	<input
		type="text"
		class="form-control"
		placeholder="Search accounts..."
		bind:value={query}
		oninput={() => search(query)}
	/>
	{#if query}
		<div class="search-results card mt-1">
			<ul class="list-group list-group-flush">
				{#each $results as account}
					<li class="list-group-item list-group-item-action">
						<button type="button" class="btn" onclick={() => select(account)}>
							{account.data.username} - {account.data.firstName}
							{account.data.lastName}
						</button>
					</li>
				{/each}
				{#if $results.length === 0}
					<li class="list-group-item text-muted">No results found.</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>
