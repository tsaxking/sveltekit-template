<!--
@component
Popup notification history list.

**Props**
- `test`: `boolean` — Populate with test data on mount.

**Example**
```svelte
<NotificationHistory test={false} />
```
-->

<script lang="ts">
	import { history } from '$lib/utils/prompts';
	import { onMount } from 'svelte';

	interface Props {
		test: boolean;
	}

	const { test }: Props = $props();

	onMount(() => {
		if (test) {
			history.set([
				{
					autoHide: 1,
					color: 'danger',
					message: 'Hi',
					title: 'Hello'
				}
			]);
		}
	});
</script>

<div class="container-fluid">
	{#if $history.length}
		{#each $history as popup}
			<div class="row mb-3">
				<div class="card">
					<div
						class="card-body"
						style="
                            border-color: var(--bs-{popup.color});
                            border-width: 1px;
                            border-style: solid;
                        "
					>
						<div class="card-title">
							{popup.title}
						</div>
						<div class="card-text">
							{popup.message}
						</div>
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<div class="row mb-3">
			<i>No notifications</i>
		</div>
	{/if}
</div>
