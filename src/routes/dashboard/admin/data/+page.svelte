<script lang="ts">
	import '$lib/model/account';
	import '$lib/model/analytics';
	import '$lib/model/permissions';
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
	<div class="row mb-3">
		{#each structs as [name]}
			<div class="col-md-3">
				<a href="/dashboard/admin/data/{name}" class="text-reset text-decoration-none">
					<div
						class="card layer-2"
						style="
                        height: 100px;
                    "
					>
						<div class="card-body">
							<h5 class="card-title">
								{capitalize(fromSnakeCase(name))}
							</h5>
						</div>
					</div>
				</a>
			</div>
		{/each}
	</div>
</div>
