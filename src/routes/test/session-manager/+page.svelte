<!--
@component
Session manager test page at `/test/session-manager`.
-->
<script lang="ts">
	import Grid from '$lib/components/general/Grid.svelte';
	import { SessionManager, type Connection } from '$lib/services/session-manager';
	import { sse } from '$lib/services/sse';
	import { contextmenu } from '$lib/utils/contextmenu';
	import { onMount } from 'svelte';

	const manager = new SessionManager();
	const managerState = manager.state;
	const connections = SessionManager.connections;

	let errorMessage: string | null = null;
	let lastAction: string | null = null;
	let lastActionError: string | null = null;
	let sseConnected = false;

	const refreshConnections = async () => {
		// Clear existing connections so that init() does not append duplicates.
		SessionManager.connections.clear();
		const res = await SessionManager.init();
		if (res.isErr()) {
			errorMessage = res.error?.message ?? 'Failed to refresh connections.';
			return;
		}
		errorMessage = null;
	};

	const sendTestEvent = async (connection: Connection) => {
		lastAction = null;
		lastActionError = null;

		if (!manager.id) {
			lastActionError = 'Session manager is not ready yet.';
			return;
		}
		const res = await connection.send('session-manager:test', {
			from: manager.id,
			at: new Date().toISOString(),
			url: connection.url
		});
		if (res.isErr()) {
			lastActionError = res.error?.message ?? 'Failed to send test event.';
			return;
		}
		lastAction = `Sent test event to ${connection.url}`;
	};

	const startManager = async () => {
		const res = await manager.start();
		if (res.isErr()) {
			errorMessage = res.error?.message ?? 'Failed to start session manager.';
			return;
		}
		await refreshConnections();
		setTimeout(() => {
			refreshConnections();
		}, 1000);
	};

	onMount(() => {
		sse.on('connect', () => {
			sseConnected = true;
			startManager();
		});
		sse.connect();
		return () => {};
	});
</script>

<div class="container">
	<div class="row mb-3">
		<div class="col">
			<h1>
				Session Manager State:
				<span
					data-testid="manager-state"
					data-state={$managerState}
					class:text-success={$managerState === 'Connected'}
					class:text-warning={$managerState === 'Connecting...'}
					class:text-danger={$managerState === 'Disconnected'}
				>
					{$managerState}
				</span>
			</h1>
			<p class="text-muted" data-testid="sse-state" data-connected={sseConnected}>
				SSE Connected: {sseConnected ? 'true' : 'false'}
			</p>
			<p class="text-muted" data-testid="manager-id">Manager ID: {manager.id ?? 'none'}</p>
			{#if errorMessage}
				<p class="text-danger" data-testid="manager-error">{errorMessage}</p>
			{/if}
			{#if lastAction}
				<p class="text-success" data-testid="manager-last-action">{lastAction}</p>
			{/if}
			{#if lastActionError}
				<p class="text-danger" data-testid="manager-last-action-error">{lastActionError}</p>
			{/if}
			<div class="d-flex gap-2">
				<button
					class="btn btn-sm btn-outline-primary"
					data-testid="refresh-connections"
					on:click={refreshConnections}
				>
					Refresh Connections
				</button>
				<span class="text-muted" data-testid="connections-count">
					Connections: {$connections.length}
				</span>
			</div>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<h2>Test Controls</h2>
			<div class="list-group" data-testid="connections-list">
				{#each $connections as connection}
					<div
						class="list-group-item d-flex flex-column gap-2"
						data-testid="connection-row"
						data-connection-id={connection.id}
						data-connection-url={connection.url}
					>
						<div class="d-flex justify-content-between align-items-center">
							<strong data-testid="connection-url">{connection.url}</strong>
							<span class="text-muted">{connection.generalizedUrl ?? '—'}</span>
						</div>
						<div class="d-flex gap-2">
							<button
								class="btn btn-sm btn-outline-success"
								data-testid="send-test"
								on:click={() => sendTestEvent(connection)}
							>
								Send Test Event
							</button>
							<button
								class="btn btn-sm btn-outline-warning"
								data-testid="reload-connection"
								on:click={() => connection.reload()}
							>
								Reload
							</button>
						</div>
					</div>
				{/each}
			</div>
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
