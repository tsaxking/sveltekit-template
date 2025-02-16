<script lang="ts">
	import SideNav from './SideNav.svelte';
	import Notifications from './Notifications.svelte';
	interface Props {
		title: string;
	}

	const { title }: Props = $props();

	let notifs = $state(0);
</script>

<nav class="navbar navbar-expand-lg bg-body-tertiary">
	<div class="d-flex justify-content-between w-100">
		<div class="start d-flex align-items-center">
			<button
				class="btn mx-3"
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
		<div class="end">
			<button
				class="me-5 btn position-relative"
				type="button"
				data-bs-toggle="offcanvas"
				data-bs-target="#notifications"
				aria-controls="notifications"
			>
				<!-- <span class="navbar-toggler-icon"></span> -->
				<i class="material-icons"> notifications </i>
				{#if notifs}
					<span class="position-absolute badge rounded-pill bg-danger">
						{notifs}
						<span class="visually-hidden">unread messages</span>
					</span>
				{/if}
			</button>
		</div>
	</div>
	<!-- <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
            <li class="nav-item">
                <a class="nav-link active" aria-current="page" href="#">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#">Features</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#">Pricing</a>
            </li>
            <li class="nav-item">
                <a class="nav-link disabled" aria-disabled="true">Disabled</a>
            </li>
        </ul>
    </div> -->
</nav>

<SideNav
	id="pages"
/>

<!-- <Notifications bind:notifs /> -->
