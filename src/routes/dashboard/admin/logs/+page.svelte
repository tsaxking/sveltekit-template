<script lang="ts">
	import { goto } from '$app/navigation';
	import { copy } from '$lib/utils/clipboard.js';
	import { dateTime } from 'ts-utils/clock';
	import { capitalize, fromSnakeCase, abbreviate } from 'ts-utils/text';
	import nav from '$lib/imports/admin';

	nav();

	const { data } = $props();
	const logs = $derived(data.logs);
	const structs = $derived(data.structs);
	const accountId = $derived(data.accountId);
	const message = $derived(data.message);
	const struct = $derived(data.struct);
	const type = $derived(data.type);
	const dataId = $derived(data.dataId);
	const page = $derived(data.page);
	const limit = $derived(data.limit);
	const count = $derived(data.count);
	const total = $derived(data.total);

	const search = (config: {
		accountId: string | undefined | null;
		type: string | undefined | null;
		dataId: string | undefined | null;
		struct: string | undefined | null;
		message: string | undefined | null;
		page: number;
		limit: number;
	}) => {
		const sp = new URLSearchParams();
		if (config.accountId) sp.set('account', config.accountId);
		if (config.type) sp.set('type', config.type);
		if (config.dataId) sp.set('data', config.dataId);
		if (config.struct) sp.set('struct', config.struct);
		if (config.message) sp.set('message', config.message);
		sp.set('page', config.page.toString());
		sp.set('limit', config.limit.toString());
		// location.href = `/dashboard/admin/logs?${sp.toString()}`;
		goto(`/dashboard/admin/logs?${sp.toString()}`);
	};
</script>

<svelte:head>
	<title>Admin Logs</title>
</svelte:head>

<div class="container">
	<div class="row mb-3">
		<div class="col">
			<h1>Logs</h1>
			<small class="text-muted">
				Filtered {count} / {total} logs
			</small>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<h3>Table:</h3>
			<select
				class="form-control"
				onchange={(e) => {
					const value = e.currentTarget.value ? e.currentTarget.value : undefined;
					search({
						accountId,
						type,
						dataId,
						struct: value,
						message,
						page: 1,
						limit
					});
				}}
			>
				<option value="" selected={struct === undefined}>All</option>
				{#each structs as s}
					<option value={s} selected={s === struct}>{capitalize(fromSnakeCase(s))}</option>
				{/each}
			</select>
		</div>
	</div>
	<div class="row">
		<div class="col">
			<div class="d-flex align-items-center">
				<button
					type="button"
					class="btn btn-secondary"
					disabled={page === 1}
					onclick={() =>
						search({ accountId, type, dataId, struct, message, page: page - 1, limit })}
				>
					<i class="material-icons">arrow_back</i>
				</button>
				<h5 class="mx-3 mb-0">
					Page {page} of {Math.ceil(count / limit)}
				</h5>
				<button
					type="button"
					class="btn btn-secondary"
					disabled={page * limit >= count}
					onclick={() =>
						search({ accountId, type, dataId, struct, message, page: page + 1, limit })}
				>
					<i class="material-icons">arrow_forward</i>
				</button>
			</div>
		</div>
	</div>
	<div class="row mb-3">
		<h5>Instructions</h5>
		<p class="text-muted">
			Search Functionality:
			<br />
			Each column can be filtered by typing in their respective search boxes.
			<br />
			Example: CLI in Account ID will show logs with "CLI" in the Account ID.
			<br />
			<br />
			🚫 Exclude a Value:
			<br />

			Use ! before a word to exclude results containing that word until the next filter.
			<br />
			Example: !debug → Hides logs with "debug".
			<br />
			<br />
			🔍 Combine Multiple Filters:
			<br />

			Use & to mix inclusion and exclusion.
			<br />
			Example: !debug&error → Shows logs with "error" but without "debug".
			<br />
			<br />
			📝 More Examples:
			<br />

			warning → Finds logs with "warning".
			<br />
			!info&critical → Finds logs with "critical" but not "info".
			<br />
			user123 → Finds logs related to "user123".
		</p>
	</div>
	<div class="row mb-3">
		<div class="col">
			<h3>Search:</h3>
			<div class="input-group">
				<input
					type="text"
					class="form-control"
					placeholder="Account ID"
					value={accountId || ''}
					onchange={(e) =>
						search({
							accountId: e.currentTarget.value,
							type,
							dataId,
							struct,
							message,
							page: 1,
							limit
						})}
				/>
				<select
					class="form-control"
					onchange={(e) => {
						const value = e.currentTarget.value ? e.currentTarget.value : undefined;
						search({ accountId, type: value, dataId, struct, message, page: 0, limit });
					}}
				>
					<option value="" selected={type === undefined}> All </option>
					<option value="create" selected={type === 'create'}> Create </option>
					<option value="delete" selected={type === 'delete'}> Delete </option>
					<option value="update" selected={type === 'update'}> Update </option>

					<option value="archive" selected={type === 'archive'}> Archive </option>

					<option value="restore" selected={type === 'restore'}> Restore </option>

					<option value="restore-version" selected={type === 'restore-version'}>
						Restore Version
					</option>
					<option value="delete-version" selected={type === 'delete-version'}>
						Delete Version
					</option>
				</select>
				<input
					type="text"
					class="form-control"
					placeholder="Data ID"
					value={dataId || ''}
					onchange={(e) =>
						search({
							accountId,
							type,
							dataId: e.currentTarget.value,
							struct,
							message,
							page: 1,
							limit
						})}
				/>
				<input
					type="text"
					class="form-control"
					placeholder="Message"
					value={message || ''}
					onchange={(e) =>
						search({
							accountId,
							type,
							dataId,
							struct,
							message: e.currentTarget.value,
							page: 1,
							limit
						})}
				/>
			</div>
		</div>
	</div>
	<div class="row mb-3">
		<div class="table-responsive">
			{#key logs}
				<table class="table">
					<thead>
						<tr>
							<th>Row</th>
							<th>Time</th>
							<th>Account</th>
							<th>Type</th>
							<th>Data ID</th>
							<th>Struct</th>
							<th>Message</th>
						</tr>
					</thead>
					<tbody>
						{#each logs as log, i}
							<tr>
								<td>{(page - 1) * limit + i + 1}</td>
								<td>
									{dateTime(log.created)}
								</td>
								<td
									title={log.accountId}
									class="cursor-pointer"
									onclick={() => copy(log.accountId, true)}
									>{log.account?.username || log.accountId}</td
								>
								<td>{log.type}</td>
								<td
									title={JSON.stringify(log.data, null, 4)}
									class="cursor-pointer"
									onclick={() => copy(log.dataId, true)}>{abbreviate(log.dataId)}</td
								>
								<td title={log.struct} class="cursor-pointer" onclick={() => copy(log.struct, true)}
									>{capitalize(fromSnakeCase(log.struct))}</td
								>
								<td
									title={log.message}
									class="cursor-pointer"
									onclick={() => copy(log.message, true)}>{log.message}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			{/key}
		</div>
	</div>
</div>

<style>
	.cursor-pointer {
		cursor: pointer;
	}
</style>
