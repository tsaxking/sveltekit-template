<script lang="ts">
	import { goto } from '$app/navigation';
	import { copy } from '$lib/utils/clipboard.js';
	import { dateTime } from 'ts-utils/clock';
	import { capitalize, fromCamelCase, fromSnakeCase, abbreviate } from 'ts-utils/text';

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

	$inspect(logs);
	$inspect(structs);

	const search = (config: {
		accountId: string | undefined | null;
		type: string | undefined | null;
		dataId: string | undefined | null;
		struct: string | undefined | null;
		message: string | undefined | null;
		offset: number;
		limit: number;
	}) => {
		const sp = new URLSearchParams();
		if (config.accountId) sp.set('accountId', config.accountId);
		if (config.type) sp.set('type', config.type);
		if (config.dataId) sp.set('dataId', config.dataId);
		if (config.struct) sp.set('struct', config.struct);
		if (config.message) sp.set('message', config.message);
		sp.set('offset', config.offset.toString());
		sp.set('limit', config.limit.toString());
		// location.href = `/dashboard/admin/logs?${sp.toString()}`;
		goto(`/dashboard/admin/logs?${sp.toString()}`);
	};
</script>

<div class="container">
	<div class="row mb-3">
		<div class="col-12">
			<h1>Logs</h1>
		</div>
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
						offset: 0,
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
	<div class="row mb-3">
		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th>Time</th>
						<th>Account</th>
						<th>Type</th>
						<th>Data ID</th>
						<th>Struct</th>
						<th>Message</th>
					</tr>
				</thead>
				<tbody>
					{#each logs as log}
						<tr>
							<td>
								{dateTime(log.created)}
							</td>
							<td
								title={log.accountId}
								class="cursor-pointer"
								onclick={() => copy(log.accountId, true)}
								>{log.account?.username || log.accountId}</td
							>
							<td title={log.type} class="cursor-pointer" onclick={() => copy(log.type, true)}
								>{log.type}</td
							>
							<td title={log.dataId} class="cursor-pointer" onclick={() => copy(log.dataId, true)}
								>{abbreviate(log.dataId)}</td
							>
							<td title={log.struct} class="cursor-pointer" onclick={() => copy(log.struct, true)}
								>{capitalize(fromSnakeCase(log.struct))}</td
							>
							<td title={log.message} class="cursor-pointer" onclick={() => copy(log.message, true)}
								>{log.message}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style>
	.cursor-pointer {
		cursor: pointer;
	}
</style>
