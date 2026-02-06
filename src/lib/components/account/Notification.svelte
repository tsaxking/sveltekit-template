<!--
@component
Notification card with read/unread and delete actions.

**Props**
- `notification`: `Account.AccountNotificationData` — Notification model.

**Example**
```svelte
<Notification {notification} />
```
-->
<script lang="ts">
	import { Account } from '$lib/model/account';

	interface Props {
		notification: Account.AccountNotificationData;
	}

	const { notification }: Props = $props();

	const read = () => {
		notification.update((d) => ({
			...d,
			read: true
		}));
	};

	const unread = () => {
		notification.update((d) => ({
			...d,
			read: false
		}));
	};

	const remove = () => {
		notification.delete();
	};
</script>

<div class="card mb-3 {!$notification.read ? 'border-' + $notification.severity : ''}">
	<div class="card-body layer-2">
		<div class="d-flex align-items-center mb-2">
			{#if $notification.icon}
				<i class="material-icons text-{$notification.severity} pe-2">{$notification.icon}</i>
			{/if}
			<h5 class="card-title mb-0">{$notification.title}</h5>

			{#if $notification.link}
				<a
					href={$notification.link}
					onclick={read}
					target="_blank"
					class="btn btn-outline-{$notification.severity} btn-sm ms-auto"
				>
					<i class="material-icons"> open_in_new </i>
					Open Link
				</a>
			{/if}
		</div>
		<p class="card-text">{$notification.message}</p>
		<div class="d-flex justify-content-between align-items-center">
			{#if $notification.read}
				<button class="btn btn-outline-secondary btn-sm" onclick={unread}>
					<i class="material-icons">mark_email_unread</i> Mark as Unread
				</button>
			{:else}
				<button class="btn btn-outline-success btn-sm" onclick={read}>
					<i class="material-icons">mark_email_read</i> Mark as Read
				</button>
			{/if}
			<button type="button" class="btn btn-outline-danger btn-sm" onclick={remove}>
				<i class="material-icons">delete</i> Delete
			</button>
		</div>
	</div>
</div>
