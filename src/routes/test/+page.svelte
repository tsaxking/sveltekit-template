<script lang="ts">
	import { Test } from '$lib/model/testing.svelte.ts';
	import { toSnakeCase } from 'ts-utils/text';

	const tests = Test.unitTest();
	let complete = $state(false);

	const generateSymbol = (state: Test.State): string => {
		switch (state) {
			case 'not started':
				return 'pending_actions';
			case 'in progress':
				return 'pending';
			case 'success':
				return 'thumb_up_alt';
			case 'failure':
				return 'error_outline';
		}
	};

	tests.promise.then(() => {
		complete = true;
	});
</script>

{#snippet test(name: string, status: Test.Status)}
	<li
		class="list-group-item data-test"
		id="test-{toSnakeCase(name.toLowerCase())}"
		data-value={status.state}
		data-message={status.message}
	>
		<i
			class="
        material-icons
        animate__bounce
        animate__infinite
    "
			class:text-success={status.state === 'success'}
			class:text-danger={status.state === 'failure'}
			class:text-warning={status.state === 'in progress'}
			class:animate__animated={status.state === 'in progress'}
		>
			{generateSymbol(status.state)}
		</i>
		{name}

		{#if status.message}
			<small class="text-muted">
				{status.message}
			</small>
		{/if}
	</li>
{/snippet}

<svelte:head>
	<title>Testing</title>
</svelte:head>

<div class="container">
	<div class="row">
		<h1>Testing</h1>
	</div>
	<div class="row">
		<ul class="list-group">
			{@render test('Connected', tests.connect)}
			{@render test('Created new', tests.new)}
			{@render test('Update', tests.update)}
			{@render test('Archive', tests.archive)}
			{@render test('Restore Archive', tests.restore)}
			{@render test('Delete', tests.delete)}
			{@render test('Read Version', tests.readVersion)}
			{@render test('Delete Version', tests.deleteVersion)}
			{@render test('Restore Version', tests.restoreVersion)}
			{@render test('Read All', tests.readAll)}
			{@render test('Read Archived', tests.readArchived)}
			{@render test('Read From Property', tests.readFromProperty)}
			{@render test('Read From Ids', tests.readFromIds)}
			{@render test('Read From Id', tests.readFromId)}
			{@render test('Read Multi Property', tests.readMultiProperty)}
			{@render test('Received New', tests.receivedNew)}
			{@render test('Received Update', tests.receivedUpdate)}
			{@render test('Received Archive', tests.receivedArchive)}
			{@render test('Received Restore', tests.receivedRestore)}
			{@render test('Received Delete', tests.receivedDelete)}
			{@render test('Pull', tests.pullData)}
		</ul>
	</div>
	<div class="row">
		<div id="test-complete" style="display: {complete ? 'block' : 'none'}">
			<h2>Tests Complete</h2>
		</div>
	</div>
</div>
