<!--
@component
Session manager test page at `/test/session-manager`.
-->
<script lang="ts">
	import Grid from '$lib/components/general/Grid.svelte';
	import { SessionManager } from '$lib/services/session-manager';
	import { contextmenu } from '$lib/utils/contextmenu';
	import { onMount } from 'svelte';

	const manager = new SessionManager();
	const managerState = manager.state;
	const connections = SessionManager.connections;

	onMount(() => {
		manager.start().then(() => {
			SessionManager.init();
		});
		return () => {};
	});
</script>

<div class="container">
	<div class="row mb-3">
		<div class="col">
			<h1>
				Session Manager State:
				<span
					class:text-success={$managerState === 'Connected'}
					class:text-warning={$managerState === 'Connecting...'}
					class:text-danger={$managerState === 'Disconnected'}
				>
					{$managerState}
				</span>
			</h1>
		</div>
	</div>
	<div class="row mb-3">
		{#if $managerState === 'Connected'}
			<Grid
				data={manager}
				opts={{
					columnDefs: [
						{
							field: 'data.id',
							headerName: 'Connection ID'
						},
						{
							field: 'data.url',
							headerName: 'URL'
						},
						{
							field: 'data.generalizedUrl',
							headerName: 'Generalized URL'
						},
						{
							field: 'data.state',
							headerName: 'State'
						}
					],
					preventDefaultOnContextMenu: true,
					onCellContextMenu: (event) => {
						if (!event.data) return;
						if (!event.event) return;
						const connection = event.data;
						contextmenu(event.event as PointerEvent, {
							options: [
								{
									name: 'Reload',
									icon: {
										type: 'material-icons',
										name: 'refresh'
									},
									action: () => {
										connection.reload();
									}
								},
								{
									name: 'Remove from Manager',
									icon: {
										type: 'material-icons',
										name: 'remove'
									},
									action: () => {
										manager.removeConnection(connection.id);
									}
								}
							],

							width: '200px'
						});
					}
				}}
				height="400px"
			/>
		{:else}
			<p>Waiting for connection...</p>
		{/if}
	</div>
	<div class="row mb-3">
		<div class="col">
			<h2>All Connections ({$connections.length})</h2>
			<Grid
				data={connections}
				opts={{
					columnDefs: [
						{
							field: 'data.id',
							headerName: 'Connection ID',
							cellClass: (params) => {
								if (params.data?.self) {
									return 'text-info fw-bold';
								}
								return '';
							}
						},
						{
							field: 'data.url',
							headerName: 'URL'
						},
						{
							field: 'data.generalizedUrl',
							headerName: 'Generalized URL'
						},
						{
							field: 'data.state',
							headerName: 'State'
						}
					],
					preventDefaultOnContextMenu: true,
					onCellContextMenu: (event) => {
						if (!event.data) return;
						if (!event.event) return;
						const connection = event.data;
						contextmenu(event.event as PointerEvent, {
							options: [
								{
									name: 'Add to Manager',
									icon: {
										type: 'material-icons',
										name: 'add'
									},
									action: () => {
										manager.addConnection(connection);
									}
								}
							],
							width: '200px'
						});
					}
				}}
				height="400px"
			/>
		</div>
	</div>
</div>
