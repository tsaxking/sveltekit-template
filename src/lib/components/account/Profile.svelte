<script lang="ts">
	import type { Account } from '$lib/model/account';

	interface Props {
		account: Account.AccountData;
	}

	const { account }: Props = $props();
</script>

<img src={$account.picture} alt="{$account.username}'s Profile Picture" srcset="" />
