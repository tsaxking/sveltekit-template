<script lang="ts">
	import { Account } from '$lib/model/account';
	import { onMount } from 'svelte';
	import Notification from '../account/Notification.svelte';

	const id = 'notifications';

	interface Props {
		notifs: number;
	}

	let _limit = $state(10);
	let _page = $state(0);
	let { notifs = $bindable() }: Props = $props();

	let notifications = $state(
		Account.AccountNotification.arr([
			// Account.AccountNotification.Generator({
			// 	accountId: 'string',
			// 	title: 'string',
			// 	severity: 'danger',
			// 	message: 'string',
			// 	icon: 'string',
			// 	link: 'string',
			// 	read: false,
			//     id: 'string',
			//     created: 'string',
			//     updated: 'string',
			//     archived: false,
			//     universes: 'string',
			//     attributes: 'string',
			//     lifetime: 0,
			// })
		])
	);

	onMount(() => {
		notifications = Account.getNotifs(/*limit, page*/);

		const unsub = notifications.subscribe((d) => {
			notifs = d.filter((n) => !n.data.read).length;
		});

		return () => {
			unsub();
		};
	});

	// const test = () => {
	// 	Account.AccountNotification.new({
	// 		accountId: Account.self.get().data.id || 'guest',
	// 		title: 'Test Notification',
	// 		icon: 'info',
	// 		message: 'This is a test notification.',
	// 		severity: 'info',
	// 		link: '/test',
	// 		read: false
	// 	});
	// };
</script>

<div class="offcanvas offcanvas-end" tabindex="-1" {id} aria-labelledby="{id}Label">
	<div class="offcanvas-header layer-1">
		<h5 class="offcanvas-title" id="{id}Label">My Notifications</h5>
		<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
	</div>
	<div class="offcanvas-body layer-1">
		<ul class="list-unstyled">
			{#each $notifications as notification}
				<Notification {notification} />
			{/each}
		</ul>
	</div>
	<!-- <button type="button" class="btn btn-success" onclick={test}> Create Test Notification </button> -->
</div>
