<script lang="ts">
	import Grid from '$lib/components/general/Grid.svelte';
	import { Account } from '$lib/model/account.js';
	import { copy } from '$lib/utils/clipboard.js';
	import { contextmenu } from '$lib/utils/contextmenu.js';
	import { writable } from 'svelte/store';

	const { data } = $props();
	const account = $derived(Account.Account.Generator(data.account));
	const sessions = $derived(writable(data.sessions));

	const page = $derived(data.page);
	const limit = $derived(data.limit);
	const total = $derived(data.total);
</script>

<svelte:head>
	<title>Admin: Account {$account.username}</title>
</svelte:head>

<div class="container">
	<div class="row mb-3">
		<div class="col">
			<h1>
				Account: {$account.username}
			</h1>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<h3>
				Sessions (Page {page + 1} / {Math.ceil(total / limit)} - Total {total})
			</h3>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<Grid
				data={sessions}
				opts={{
					columnDefs: [
						{
							field: 'ip'
						},
						{
							field: 'userAgent'
						},
						{
							field: 'tabs'
						},
						{
							field: 'prevUrl'
						}
					],
					onCellContextMenu: (params) => {
						contextmenu(params.event as MouseEvent, {
							options: [
								{
									name: 'Copy IP',
									action: () => {
										copy(params.data?.ip || '', true);
									},
									icon: {
										type: 'material-icons',
										name: 'content_copy'
									}
								},
								{
									name: 'Sign Out',
									action: async () => {
										if (params.data?.id) Account.signOutOfSession(params.data.id);
									},
									icon: {
										type: 'material-icons',
										name: 'logout'
									}
								}
							],
							width: '150px'
						});
					},
					preventDefaultOnContextMenu: true
				}}
				rowNumbers={true}
				height="600px"
			/>
		</div>
	</div>
</div>
