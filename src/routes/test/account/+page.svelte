<script lang="ts">
	const { data } = $props();

	const account = $derived(data.account);
</script>

{#if account}
	<h1 id="accountInfo" data-success={true}>
		You are signed in as {account.username} (ID: {account.id})
	</h1>
{:else}
	<h1 id="accountInfo" data-success={false}>You are not signed in.</h1>
{/if}
