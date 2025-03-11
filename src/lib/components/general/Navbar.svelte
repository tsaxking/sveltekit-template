<script lang="ts">
	import SideNav from './SideNav.svelte';
	import Notifications from './Notifications.svelte';
	import { Account } from '$lib/model/account';
	import { onMount } from 'svelte';
	interface Props {
		title: string;
	}

	const { title }: Props = $props();
	let notifs = $state(0);
	const self = Account.getSelf();
</script>

<nav class="navbar navbar-expand-lg bg-body-tertiary">
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
				href="/home">{title}</a
			>
		</div>
		<div class="end d-flex align-items-center">
			<div class="dropdown">
				<button
					class="btn dropdown-toggle px-2"
					type="button"
					data-bs-toggle="dropdown"
					aria-expanded="false"
				>
					<i class="material-icons">account_circle</i>
				</button>
				<ul class="dropdown-menu">
					{#if $self.data.username === 'guest'}
						<li><a class="dropdown-item" href="/account/sign-in">Sign In</a></li>
					{:else}
						<!-- <li><a class="dropdown-item" href="/account/profile">Profile</a></li> -->
						<li><a class="dropdown-item" href="/account/sign-out">Sign Out</a></li>
					{/if}
				</ul>
				<button
					class="btn px-2"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#navbarNav"
					aria-controls="navbarNav"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<i class="material-icons"> menu </i>
				</button>
			</div>
			<!-- <button
				class="me-5 btn position-relative"
				type="button"
				data-bs-toggle="offcanvas"
				data-bs-target="#notifications"
				aria-controls="notifications"
			>
				<i class="material-icons"> notifications </i>
				{#if notifs}
					<span class="position-absolute badge rounded-pill bg-danger">
						{notifs}
						<span class="visually-hidden">unread messages</span>
					</span>
				{/if}
			</button> -->
		</div>
	</div>
</nav>

<div
	class="collapse navbar-collapse position-fixed bg-dark p-3 shadow border-secondary border-1"
	id="navbarNav"
>
	<ul class="navbar-nav">
		<li class="nav-item">
			<a class="nav-link active" aria-current="page" href="/">Home</a>
		</li>
		<li class="nav-item">
			<a class="nav-link active ws-nowrap" aria-current="page" href="/dashboard/mentor">Mentors</a>
		</li>
	</ul>
</div>
<SideNav id="pages" />

<!-- <Notifications bind:notifs /> -->
