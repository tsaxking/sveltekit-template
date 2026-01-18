<script lang="ts">
	import { Table } from '$lib/services/db/table';
	import { onMount } from 'svelte';

	const User = new Table('users', {
		name: 'string',
		age: 'number'
	});

	let data = $state(User.arr());

	const pull = async () => {
		data = await User.all({
			pagination: false
		}).unwrap();
	};

	User.on('update', pull);
	User.on('delete', pull);
	User.on('new', pull);

	onMount(() => {
		pull();
	});
</script>

<button
	class="btn btn-primary mb-3"
	onclick={async () => {
		data = await User.all({
			pagination: false
		}).unwrap();
	}}
>
	Load Users
</button>

<button
	type="button"
	class="btn btn-success mb-3 ms-2"
	onclick={async () => {
		const name = `User ${Math.floor(Math.random() * 1000)}`;
		const age = Math.floor(Math.random() * 100);
		User.new({ name, age }).unwrap();
	}}
>
	Add User
</button>

{#each $data as user}
	<div class="card mb-2 p-3">
		<div><strong>Name:</strong> {user.data.name}</div>
		<div><strong>Age:</strong> {user.data.age}</div>
		<button
			type="button"
			class="btn btn-warning mt-2 me-2"
			onclick={async () => {
				await user
					.update((data) => ({
						...data,
						age: Math.floor(Math.random() * 100)
					}))
					.unwrap();
			}}
		>
			Randomize
		</button>
		<button
			type="button"
			class="btn btn-danger mt-2"
			onclick={async () => {
				await user.delete().unwrap();
			}}
		>
			Delete
		</button>
	</div>
{/each}
