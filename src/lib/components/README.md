# src/lib/components

All files in this directory are Svelte components that can be used with each other, in the model, or in the src/lib/routes/\* files.

## Protocols

- Svelte files are all named using camel case, e.g., `MyComponent.svelte`.
- No file can start with a number.
- Each must use `<script lang="ts">` for TypeScript support.
- If a component requires parameters from a parent component, do this:

```svelte
<script lang="ts">
	interface Props {
		param1: string;
		param2: number;
	}

	const { param1, param2 }: Props = $props();
</script>
```

- Every component must have documentation at the top of the file explaining its purpose and usage.
- All components must adhere to the svelte5 guidelines. View them [here](https://svelte.dev/docs/svelte/overview).
- Components should be modular and reusable, avoiding hard-coded values where possible.
- Use TypeScript for type safety and clarity.
- Ensure proper error handling and validation for any inputs or props. (e.g., if a return type from a function is `Result<T, E>` do not `.unwrap()` it, handle both cases properly).
- Follow consistent coding styles and conventions for readability.
