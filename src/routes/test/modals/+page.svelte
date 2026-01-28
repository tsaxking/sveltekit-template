<!--
@component
Modal test page at `/test/modals`.
-->
<script lang="ts">
	import { prompt, alert, confirm, choose, select, colorPicker, notify } from '$lib/utils/prompts';
</script>

<div class="container">
	<div class="row mb-3">
		<div class="col">
			<h1>Modals</h1>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<button type="button" class="btn btn-primary" onclick={() => prompt('This is a prompt')}>
				Open prompt
			</button>
		</div>
		<div class="col">
			<button type="button" class="btn btn-primary" onclick={() => alert('This is an alert')}>
				Open alert
			</button>
		</div>
		<div class="col">
			<button
				type="button"
				class="btn btn-primary"
				onclick={async () => {
					const result = await confirm('This is a confirm');
					alert(`You selected: ${result}`);
				}}
			>
				Open confirm
			</button>
		</div>
		<div class="col">
			<button
				type="button"
				class="btn btn-primary"
				onclick={async () => {
					const result = await choose('This is a choose', 'Option A', 'Option B');
					alert(`You selected: ${result}`);
				}}
			>
				Open choose
			</button>
		</div>
		<div class="col">
			<button
				type="button"
				class="btn btn-primary"
				onclick={async () => {
					const result = await select('This is a select', ['Option 1', 'Option 2', 'Option 3']);
					alert(`You selected: ${result}`);
				}}
			>
				Open select
			</button>
		</div>
		<div class="col">
			<button
				type="button"
				class="btn btn-primary"
				onclick={async () => {
					const result = await colorPicker('This is a color picker');
					alert(`You selected: ${result}`);
				}}
			>
				Open color picker
			</button>
		</div>
		<div class="col">
			<button
				type="button"
				class="btn btn-primary"
				onclick={() =>
					notify({
						autoHide: 3000,
						color: 'info',
						message: 'This is a notification',
						title: 'Notification'
					})}
			>
				Show notification
			</button>
		</div>
	</div>
</div>

<style>
	button {
		margin-right: 10px;
		margin-bottom: 10px;
		height: 150px;
		width: 150px;
	}
</style>
