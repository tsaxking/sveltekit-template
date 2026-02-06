<!--
@component
Password input with visibility toggle and optional label.

**Props**
- `value`?: `string` — Current value (bindable).
- `placeholder`: `string` — Input placeholder.
- `onInput`?: `(value: string) => void` — Input handler.
- `onChange`?: `(value: string) => void` — Change handler.
- `name`: `string` — Input name.
- `floatingLabel`?: `boolean` — Use floating label layout.
- `label`?: `string` — Label text.
- `buttonColor`?: `'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link'` — Toggle button color.
- `id`?: `string` — Input id (defaults to `name`).

**Example**
```svelte
<Password name="password" placeholder="Password" label="Password" floatingLabel />
```
-->
<script lang="ts">
	interface Props {
		value?: string;
		placeholder: string;
		onInput?: (value: string) => void;
		onChange?: (value: string) => void;
		name: string;
		floatingLabel?: boolean;
		label?: string;
		buttonColor?:
			| 'primary'
			| 'secondary'
			| 'success'
			| 'danger'
			| 'warning'
			| 'info'
			| 'light'
			| 'dark'
			| 'link';
		id?: string;
	}

	let {
		value = $bindable(),
		placeholder,
		onInput,
		onChange,
		name,
		floatingLabel,
		label,
		buttonColor,
		id
	}: Props = $props();

	let type: 'text' | 'password' = $state('password');

	$effect(() => {
		if (!id) {
			id = name;
		}
	});

	const toggle = () => {
		type = type === 'text' ? 'password' : 'text';
		input.focus();
	};

	let input: HTMLInputElement;
</script>

{#snippet password()}
	<input
		bind:this={input}
		{type}
		{placeholder}
		bind:value
		{name}
		class="form-control"
		oninput={(e) => onInput?.(e.currentTarget.value)}
		onchange={(e) => onChange?.(e.currentTarget.value)}
		{id}
	/>
{/snippet}

<div class="input-group mb-3">
	{#if label}
		{#if floatingLabel}
			<div class="form-floating">
				{@render password()}
				<label for={id ?? name} class="form-label">
					{label}
				</label>
			</div>
		{:else}
			{@render password()}
			<label for={id ?? name} class="form-label">
				{label}
			</label>
		{/if}
	{:else}
		{@render password()}
	{/if}
	<button onclick={toggle} type="button" class="btn btn-{buttonColor ?? 'secondary'}">
		<i class="material-icons cursor-pointer mx-auto">
			{type === 'text' ? 'visibility' : 'visibility_off'}
		</i>
	</button>
</div>
