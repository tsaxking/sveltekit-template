<script lang="ts">
	import '$lib/model/account';
	import '$lib/model/analytics';
	import '$lib/model/permissions';
	import '$lib/model/testing.svelte';
	import { Struct } from '$lib/services/struct';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';

	const structs = $state(Array.from(Struct.structs));
</script>

<svelte:head>
	<title>Admin Data</title>
	<meta
		name="description"
		content="Manage your data structures and entries in the admin dashboard."
	/>
</svelte:head>

<div class="container layer-1">
	<div class="row">
		{#each structs as [name]}
			<div
				class="col-md-3"
				style="
				padding: 10px;
			"
			>
				<a href="/dashboard/admin/data/{name}" class="text-reset text-decoration-none">
					<div
						class="card layer-2"
						style="
                        height: 100px;
                    "
					>
						<div class="card-body d-flex justify-content-center align-items-center">
							<h5 class="card-title text-center">
								{capitalize(fromSnakeCase(name))}
							</h5>
						</div>
					</div>
				</a>
			</div>
		{/each}
	</div>
</div>
