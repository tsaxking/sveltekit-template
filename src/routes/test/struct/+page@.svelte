<!--
@component
Struct test page at `/test/struct`.
-->
<script lang="ts">
	import '$lib/model/account';
	import '$lib/model/analytics';
	import { Permissions } from '$lib/model/permissions';
	import '$lib/model/testing.svelte';
	import { writable } from 'svelte/store';
	import { Requests } from '$lib/utils/requests';
	import { browser } from '$app/environment';

	// Insert all other structs here

	import { type Blank, Struct } from '$lib/services/struct';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';

	const structs = writable<[Struct<Blank>, 'connecting...' | 'connected' | string][]>([]);

	if (browser) {
		Requests.setMeta('x-no-auto-sign-in', 'true');
		document.cookie = 'no_auto_sign_in=true; path=/';
	}

	const complete: string[] = $state([]);
	const pass: string[] = $state([]);

	let blockStatus = $state<'pending' | 'blocked' | 'allowed' | 'error'>('pending');
	let blockMessage = $state('');

	const runBlockTest = async () => {
		blockStatus = 'pending';
		blockMessage = '';
		const res = await Permissions.RoleRuleset.new({
			role: 'blocked-test-role',
			entitlement: 'blocked-test-entitlement',
			targetAttribute: 'blocked-test-attr',
			parent: '',
			name: 'Blocked Test Ruleset',
			description: 'Struct registry block check',
			featureScopes: '[]'
		});

		if (res.isErr()) {
			const message = res.error?.message ?? 'Unknown error';
			blockMessage = message;
			if (message.toLowerCase().includes('unauthorized') || message.includes('403')) {
				blockStatus = 'blocked';
			} else {
				blockStatus = 'error';
			}
			return;
		}

		if (res.value?.success) {
			blockStatus = 'allowed';
			blockMessage = 'Create succeeded when it should be blocked.';
		} else {
			blockStatus = 'blocked';
			blockMessage = res.value?.message ?? 'Blocked without a message.';
		}
	};

	Struct.each((s) => {
		structs.update((current) => [...current, [s, 'connecting...']]);

		setTimeout(() => {
			s.connect().then((r) => {
				complete.push(s.data.name);
				if (r.isOk()) {
					structs.update((current) =>
						current.map(([struct, status]) =>
							struct === s ? [struct, 'connected'] : [struct, status]
						)
					);
					pass.push(s.data.name);
				} else {
					structs.update((current) =>
						current.map(([struct, status]) =>
							struct === s ? [struct, r.error.message] : [struct, status]
						)
					);
				}
			});
		});
	});

	setTimeout(() => {
		runBlockTest();
	});
</script>

<ul class="list-group">
	{#each $structs as [s, status]}
		<li class="list-group-item">
			<p class="data-test">
				<strong>
					{capitalize(fromSnakeCase(s.data.name))}
				</strong>
				-
				{#if status === 'connecting...'}
					<span class="text-muted">Connecting...</span>
				{:else if status === 'connected'}
					<span class="text-success">Connected</span>
				{:else}
					<span class="text-danger">
						{status}
					</span>
				{/if}
			</p>
		</li>
	{/each}
</ul>

<h1
	id="status"
	class:hidden={complete.length !== $structs.length}
	data-pass={pass.length === $structs.length}
>
	{#if pass.length === $structs.length}
		All structs connected successfully!
	{:else}
		Some structs failed to connect.
	{/if}
</h1>

<section class="mt-4">
	<h2
		data-testid="struct-registry-blocked"
		data-status={blockStatus}
		class:text-success={blockStatus === 'blocked'}
		class:text-danger={blockStatus === 'allowed' || blockStatus === 'error'}
	>
		Struct registry block: {blockStatus}
	</h2>
	<p data-testid="struct-registry-message">{blockMessage}</p>
</section>

<style>
	.hidden {
		display: none;
	}
</style>
