<script lang="ts">
    import { Account } from "$lib/model/account";

	import { writable, get } from "svelte/store";

    const num = writable(0);
    let stateNum = $state(0);

    const self = Account.getSelf();

    const fn = () => {
        stateNum = stateNum + 1;
        num.update(n => n + 1);
    };
</script>

<button type="button" onclick={fn}>
    Click me! {$num} {stateNum}
</button>

My username is {$self.data.username}