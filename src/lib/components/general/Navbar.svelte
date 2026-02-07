<!--
@component
Top navigation bar with stack controls, theme toggle, account menu, and notifications.

**Props**
- `title`: `string` — Brand/title text.

**Example**
```svelte
<Navbar title="Dashboard" />
```
-->
<script lang="ts">
	import SideNav from './SideNav.svelte';
	import Notifications from './Notifications.svelte';
	import { Account } from '$lib/model/account';
	import { Stack } from '$lib/utils/stack';
	import ThemeSwitch from './ThemeSwitch.svelte';

	interface Props {
		title: string;
	}

	const prev = $state(Stack.prev);
	const next = $state(Stack.next);

	const { title }: Props = $props();
	let notifs = $state(0);
	const self = Account.getSelf();
</script>

<nav class="navbar navbar-expand-lg layer-2">
	<div class="d-flex justify-content-between w-100">
		<div class="start d-flex align-items-center">
			<button
				class="btn"
				type="button"
				data-bs-toggle="offcanvas"
				data-bs-target="#pages"
				aria-controls="pages"
			>
				<i class="material-icons"> menu </i>
			</button>
			<a
				class="
					navbar-brand
				"
				href="/">{title}</a
			>
		</div>
		<div class="end d-flex align-items-center">
			<button type="button" class="btn stack-btn" disabled={!$prev} onclick={() => Stack.undo()}>
				<i class="material-icons">undo</i>
			</button>
			<button type="button" class="btn stack-btn" disabled={!$next} onclick={() => Stack.redo()}>
				<i class="material-icons">redo</i>
			</button>
			<ThemeSwitch />
			<div class="dropdown">
				<button
					class="btn dropdown-toggle px-2"
					type="button"
					data-bs-toggle="dropdown"
					aria-expanded="false"
				>
					<i class="material-icons">account_circle</i>
				</button>
				<ul
					class="dropdown-menu animate__animated animate__fadeInDown animate__faster"
					style="
					position: fixed;
					top: 52px;
					left: calc(100% - 160px);
					width:	min-content;
				"
				>
					{#if $self.data.username === 'guest'}
						<li><a class="dropdown-item" href="/account/sign-in">Sign In</a></li>
					{:else}
						<li><a class="dropdown-item" href="/account/sign-out">Sign Out</a></li>
					{/if}
				</ul>
			</div>
			<button
				class="me-5 btn position-relative"
				type="button"
				data-bs-toggle="offcanvas"
				data-bs-target="#notifications"
				aria-controls="notifications"
			>
				<i class="material-icons"> notifications </i>
				{#if notifs}
					<span
						class="position-absolute badge rounded-pill bg-danger animate__animated animate__bounce animate__delay-2s animate__repeat-2"
					>
						{notifs}
						<span class="visually-hidden">unread messages</span>
					</span>
				{/if}
			</button>
		</div>
	</div>
</nav>
<SideNav id="pages" />

<Notifications bind:notifs />

<style>
	.stack-btn {
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		outline: inherit;
	}

	.stack-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
