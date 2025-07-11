<script lang="ts">
	import '$lib/model/account';
	import '$lib/model/analytics';
	import '$lib/model/permissions';
	import { writable } from 'svelte/store';

	// Insert all other structs here

	import { type Blank, Struct } from 'drizzle-struct/front-end';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';

	const structs = writable<[Struct<Blank>, 'connecting...' | 'connected' | string][]>([]);

	const complete: string[] = $state([]);
	const pass: string[] = $state([]);

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

<style>
	.hidden {
		display: none;
	}
</style>
