<!--
@component
Profile display shell for an account.

**Props**
- `account`: `Account.AccountData` — Account data to display.

**Example**
```svelte
<Profile {account} />
```
-->
<script lang="ts">
	import type { Account } from '$lib/model/account';

	interface Props {
		account: Account.AccountData;
	}

	const { account: _account }: Props = $props();
</script>

<!-- <img src={$account.picture} alt="{$account.username}'s Profile Picture" srcset="" /> -->
