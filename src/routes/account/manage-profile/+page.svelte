<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import UsernameChange from '$lib/components/account/UsernameChange.svelte';
	import { Account } from '$lib/model/account.js';
	import { StructDataStage } from '$lib/services/struct/index';

	const { data } = $props();

	const account = $derived(Account.Account.Generator(data.account));
	const info = $derived(Account.AccountInfo.Generator(data.info));

	const infoProxy = $derived(
		//
		new StructDataStage(info as any, {
			static: ['accountId']
		})
	);

	const localChanged = $derived(infoProxy.localUpdated);
</script>

<div class="container layer-1">
	<div class="row mb-3">
		<h1>Manage your profile</h1>
	</div>

	<div class="row mb-3">
		<div class="col">
			<UsernameChange {account} />
		</div>
	</div>
	<hr />
	<div class="row mb-3">
		<div class="col">
			<textarea
				name=""
				id="profile-bio"
				class="form-control w-100"
				oninput={(e) => {
					infoProxy.data.bio = e.currentTarget.value;
				}}>{$infoProxy.bio}</textarea
			>
		</div>
	</div>
	{#if $localChanged}
		<div class="row mb-3">
			<div class="col">
				<button
					type="button"
					class="btn btn-success"
					onclick={() => {
						infoProxy.save('preferLocal');
					}}
				>
					<i class="material-icons">save</i>
					Save Changes
				</button>
				<button type="button" class="btn btn-secondary" onclick={() => infoProxy.rollback()}>
					<i class="material-icons">close</i>
					Clear Changes
				</button>
			</div>
		</div>
	{/if}
</div>
