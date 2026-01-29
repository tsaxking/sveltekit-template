# src/lib/model

This is the client-side model that interfaces with the view and may interface with the server-side apis. This is where front-end structs live. Every front-end struct file must have a corresponding server-side struct file in `src/lib/server/structs`. Not every file here must be a struct file.

## Structs Conventions

```ts
import { Struct } from '$lib/services/struct';
import { browser } from '$app/environment';
import { sse } from '$lib/services/sse';
import { attemptAsync } from 'ts-utils';
import * as remote from '$lib/remotes/<my-namespace>';

export namespace MyNamespace {
	export const MyStruct = new Struct({
		name: 'my_struct', // Must match back-end struct name
		structure: {
			// Must match back-end struct fields and types
			field1: 'string',
			field2: 'number',
			field3: 'boolean'
		},
		// Socket is required to receive real-time updates from the server
		socket: sse,
		// Browser is required to prevent server-side execution due to SvelteKit's SSR
		browser
	});

	// Generate your data types for convenience
	export type MyStructData = typeof MyStruct.sample;
	export type MyStructDataArr = ReturnType<typeof MyStruct.arr>;

	// utilty functions, generally use this section to utilize the $lib/remotes/<namespace> api calls
	export const fn = () => {
		// Please use attemptAsync to handle errors gracefully
		return attemptAsync(async () => {
			return remote.fn();
		});
	};
}
```
