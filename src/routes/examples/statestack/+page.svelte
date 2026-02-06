<!--
@component
Example page for state stack at `/examples/statestack`.
-->
<script lang="ts">
	import { writable } from 'svelte/store';
	import { useCommandStack } from '$lib/services/event-stack';
	import { onMount, onDestroy } from 'svelte';

	const counter = writable(0);

	let commandStack = useCommandStack('example-page', onMount, onDestroy);

	const runCommand = (change: number) => {
		let prev: number;
		counter.subscribe((v) => (prev = v))(); // snapshot before change

		commandStack.execute({
			label: change > 0 ? 'Increment' : 'Decrement',
			do: () => counter.set(prev + change),
			undo: () => counter.set(prev)
		});
	};
</script>

<div class="p-4 space-y-4">
	<h1 class="text-xl font-bold"><code>useCommandstack</code></h1>

	<div class="flex gap-2 items-center">
		<button class="btn" onclick={() => runCommand(+1)}>Increment</button>
		<button class="btn" onclick={() => runCommand(-1)}>Decrement</button>
		<button class="btn" onclick={() => commandStack.undo()} disabled={!commandStack.canUndo}
			>Undo</button
		>
		<button class="btn" onclick={() => commandStack.redo()} disabled={!commandStack.canRedo}
			>Redo</button
		>
	</div>

	<p class="text-lg">Counter: {$counter}</p>
	<p class="text-sm text-gray-500">Try pressing Ctrl+Z / Ctrl+Y</p>
</div>

<style>
	.btn {
		padding: 0.5em 1em;
		background: #444;
		color: white;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
