<!--
@component
Account search input with debounced query results.

**Props**
- `onselect`: `(account: Account) => void` — Called when an account is chosen.
- `onsearch`?: `(accounts: Account[]) => void` — Called with search results.
- `filter`?: `(account: Account) => boolean` — Optional filter.

**Exports**
- `search(query: string)`: run a debounced search.
- `select(account: Account)`: select an account programmatically.

**Example**
```svelte
<AccountSearch onselect={(account) => console.log(account)} />
```
-->
<script lang="ts">
	import { SupaStructData, SupaStruct } from '$lib/services/supabase/supastruct.svelte';

	interface Props {
		onselect: (account: SupaStructData<'core', 'profile'>) => void;
		onsearch?: (account: SupaStructData<'core', 'profile'>[]) => void;
		filter?: (account: SupaStructData<'core', 'profile'>) => boolean;
		Profile: SupaStruct<'core', 'profile'>;
	}

	const { onselect, onsearch, filter, Profile }: Props = $props();

	let query = $state('');

	let timeout: ReturnType<typeof setTimeout>;

	let results: SupaStructData<'core', 'profile'>[] = $state([]);

	export const search = (username: string) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(async () => {
			const res = await Profile.search({
				field: 'username',
				operator: 'ilike',
				value: `%${username}%`
			});

			if (res.isErr()) {
				console.error('Search error:', res.error);
				results = [];
				return;
			}

			results = res.value;
			if (filter) results = results.filter(filter);
			if (onsearch) onsearch(results);
		}, 300);
	};

	export const select = (account: SupaStructData<'core', 'profile'>) => {
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
				{#each results as account (account.raw.id)}
					<li class="list-group-item list-group-item-action">
						<button type="button" class="btn" onclick={() => select(account)}>
							{account.raw.username} - {account.raw.first_name}
							{account.raw.last_name}
						</button>
					</li>
				{/each}
				{#if results.length === 0}
					<li class="list-group-item text-muted">No results found.</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>
