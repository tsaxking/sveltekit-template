<script lang="ts">
	import RoleSelect from '$lib/components/roles/RoleSelect.svelte';

	const { data } = $props();
	const role = $derived(data.role);
	const parent = $derived(data.parent);
	const children = $derived(data.children);
	const avaliableRulesets = $derived(data.avaliableRulesets);
	const rulesets = $derived(data.rulesets);
</script>

<div class="container layer-1">
	<div class="row mb-3">
		<div class="col">
			<label for="" class="form-label">Name</label>
			<input
				type="text"
				name="role-name"
				id="role-name"
				class="form-control h6"
				value={$role.name}
				onchange={(e) => {
					role.update((d) => ({ ...d, name: e.currentTarget.value }));
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<label for="" class="form-label">Description</label>
			<input
				type="text"
				name="role-description"
				id="role-description"
				value={$role.description}
				class="form-control"
				onchange={(e) => {
					role.update((d) => ({ ...d, description: e.currentTarget.value }));
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<!-- Rulesets -->
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<label for="" class="form-label"> Parent Role </label>
			{#if parent}
				<div class="card layer-2 mb-3">
					<div class="card-body">
						<div class="d-flex justify-content-between align-items-middle">
							<p>
								{parent.data.name}
								<br />
								<span class="text-muted text-small">{parent.data.description}</span>
							</p>
							<button
								type="button"
								class="btn"
								onclick={() =>
									role.update((d) => ({
										...d,
										parent: ''
									}))}
							>
								<i class="material-icons">close</i>
							</button>
						</div>
					</div>
				</div>
			{/if}
			<RoleSelect
				onselect={(r) => {
					role.update((d) => ({
						...d,
						parent: r.data.id ? r.data.id : ''
					}));
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<label for="" class="form-label">Children</label>
		{#each $children as child}
			<div class="col-md-4">
				<a href="/dashboard/admin/role/{child.data.id}" class="text-reset text-decoration-none">
					<div class="card layer-2">
						<div class="card-body">
							<h5 class="card-title">{child.data.name}</h5>
							<p class="text-muted">{child.data.description}</p>
						</div>
					</div>
				</a>
			</div>
		{/each}
	</div>
</div>
